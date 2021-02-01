const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = "Exchange";

exports.handler = async (event) => {
    
    const request =JSON.parse(event.body);
    const betId = request.userId + "#" + (request.betId || "");
    
    
    let queuedQueryParams = {
    TableName : exchangeTable,
    IndexName: "PK-LSI-index",
    ScanIndexForward: true,
    KeyConditionExpression: "PK = :event AND begins_with(LSI, :betId)",
    ExpressionAttributeValues: {
                ":event": request.eventId,
                ":betId": betId
                }
    };
    
  
  try{
    var queriedQueued = await dbc.query(queuedQueryParams).promise();
    console.log(queriedQueued);
  }
  catch(err){
    console.log(err);
    return response(500,err);
  }
  
  let toCancel = [];
  let cancelled = [];
  queriedQueued.Items.forEach(item=>{
      
     toCancel.push({
         Delete: {
                  TableName: exchangeTable,
                  Key:{
                          PK:item.PK,
                          SK:item.SK
                        }
                  }
                }
         );
         
    cancelled.push({
          eventId:item.PK,
          betId:item.LSI.split("#")[1],
          side:item.side,
          stake:item.stake,
          price:item.price,
          status:"cancelled"
      });
      
  });
  
  try{
    if (toCancel.length<1) return response(500,"Non-existant betId provided");
    var deleteResult = await dbc.transactWrite({TransactItems:toCancel}).promise();
    console.log(deleteResult);
    return response(200,cancelled);
  }
  catch(err){
    console.log(err);
    return response(500,err);
  }
    
    
};

function response(statusCode, message){
  return{
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}