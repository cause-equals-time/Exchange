const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = "Exchange";

exports.handler = async (event) => {
  
  const request = JSON.parse(event.body);
  const userId = request.userId;
  const ev = request.eventId;
  const side = request.side;
  const oppSideCode = side.length-3;
  const price = request.price;
  const stake = request.stake;


//For lay we want the lowest available price, so we need query for all prices from the lowest available to the requested price, in ascending order
//LAY=>  high:  1#price#z which will validate all bets 1#price#************* | low: validates all bets that are not lays, 1#************

let high,low,order;
if (side==="lay") {
  high = "1#"+price + "#z";
  low = "0#z";
  order=true;
}
//For back we want the highest available price, so we need to query for all prices from the highest available to the requested price, in descending order
//BACK=> high : 1# validates all bets that are not backs 0#************ | low = validates all lays that are the requested price or higher 0#price
else{
  high =  "1#";
  low = "0#"+price;
  order=false;
}

let params = {
    TableName : exchangeTable,
    ScanIndexForward: order,
    KeyConditionExpression: "PK = :event AND SK BETWEEN :low AND :high",
    ExpressionAttributeValues: {
                ":event": ev,
                ":low": low,
                ":high":high
  
    }
};

  try{
    var queriedData = await dbc.query(params).promise();
    console.log(queriedData);
  }
  catch(err){
    console.log(err);
    return response(500,err);
  }
  
  const time = Date.now();
  let bet = {
      PK: ev,
      SK: oppSideCode + "#" + price + "#" + time + "#" + userId,
      stake: stake,
      LSI: userId + "#" + time,
      side: side,
      price: price,
  };
  
  
  try{
    var writeResult = await dbc.transactWrite(consumeStakes(queriedData.Items,bet)).promise();
    console.log(writeResult);
    return response(200,{eventId:bet.PK, betId:time, side:bet.side, ammountOnQueue:bet.stake});
  }
  catch(err){
    console.log(err);
    return response(500,err);
  }
  
};

function consumeStakes(queriedStakes,bet){
            let i=0;
            let stakeDepleter = bet.stake;
            let betLog = [];   //will contain the logs of all matches
            let toQueue = [];  //will contain all stakes that need to be sent to the queue
            let matches = [];  //will contain all the partial matches our stake goes through until it is fully matched or partially queued
            let toDelete = []; //will contain the stakes that need to be removed from the market after being matched
            
            //While the stake meant to be placed is not depleted and there's available stakes on the opposite side
            
            while (stakeDepleter>0 && i<queriedStakes.length){
            
                //If the stake being placed covers the entirety of the next stake on queue on the opposite side
                //Our stake gets depleted of that value, a log of such match is generated and the stake that was on queue on the market is removed from the array and added to toDelete
                
                if (stakeDepleter>=queriedStakes[i].stake){
                  stakeDepleter-=queriedStakes[i].stake;
                  matches.push(generateMatch(queriedStakes[i].price,queriedStakes[i].stake));
                  betLog.push(wrapper("Update",generateLog(queriedStakes[i],[generateMatch(queriedStakes[i].price,queriedStakes[i].stake)])));
                  toDelete.push(wrapper("Delete",queriedStakes.splice(i,1)[0]));
                }
                //The remaining value of our stake is subtracted from the next stake on queue on the other side and the respective log generated, wrapped and added to betLog array
                
                else{
                  betLog.push(wrapper("Update",generateLog(queriedStakes[i],[generateMatch(queriedStakes[i].price,stakeDepleter)])));
                  queriedStakes[i].stake-=stakeDepleter;
                  toQueue.push(wrapper("Put",queriedStakes[i]));
                  matches.push(generateMatch(queriedStakes[i].price,stakeDepleter));
                  i++;
                  stakeDepleter=0;
                }
            }
            
            
            switch (stakeDepleter) {
              //Case the stake has been depleted, that means it was fully matched and the correspondent log is generated, wrapped and pushed into the array
              case 0:
                betLog.push(wrapper("Update",generateLog(bet,matches)));
                bet.stake=0;
                break;
                //Case the stake wasn't matched at all, that means it has to be sent to the queue
              case bet.stake:
                toQueue.push(wrapper("Put",bet));
                break;
                //Case there is a partial match, the logs are generated, wrapped and pushed into the array and the remainder of the stake sent to the queue
              default:
                betLog.push(wrapper("Update",generateLog(bet,matches/*bet.stake-stakeDepleter*/)));
                bet.stake=stakeDepleter;
                toQueue.push(wrapper("Put",bet));
            }
            
            return {
              TransactItems: toQueue.concat(toDelete).concat(betLog)
            };
        }
        
        
  function generateLog(matchedBet,matchedAmmount){
    return {
                    PK:matchedBet.PK + "#log",
                    SK:matchedBet.LSI,
                    stake:matchedBet.stake,
                    matched:matchedAmmount,
                    side:matchedBet.side
                  };
  }
  
  
  function generateMatch(price,matchedAmmount){
    return{
      price:price,
      matched:matchedAmmount
    };
  }
  
  
  function wrapper(operation,content){
    
    switch (operation) {
      case 'Put': return {
        
          Put: {
                  TableName:exchangeTable,
                  Item: content
                        }
        };
       case 'Update': return {
         
          Update: {
                  TableName:exchangeTable,
                  Key:{
                          PK:content.PK,
                          SK:content.SK
                        },
                  UpdateExpression: `SET matched = list_append(if_not_exists(matched, :empty_list), :matched), stake = if_not_exists(stake,:stake), side = :side`,
                  ExpressionAttributeValues: {
                                              ":stake":content.stake,
                                              ":side": content.side,
                                              ":matched": content.matched,
                                              ":empty_list": []
                                              }
                    }
        };
         case 'Delete': return {
           
          Delete: {
                  TableName:exchangeTable,
                  Key:{
                          PK:content.PK,
                          SK:content.SK
                        }
                  }
        };
        }
      
    }
    
function response(statusCode, message){
  return{
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}