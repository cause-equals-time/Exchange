const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = "Exchange";

exports.handler = async (event) => {
    
    const request = JSON.parse(event.body);
    const betId = request.userId + "#" + (request.betId || "");

    let logQueryParams = {
    TableName : exchangeTable,
    ScanIndexForward: true,
    KeyConditionExpression: "PK = :event AND begins_with(SK, :betId)",
    ExpressionAttributeValues: {
                ":event": request.eventId+"#log",
                ":betId": betId
  
                }
    };

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
    var queriedLogs = await dbc.query(logQueryParams).promise();
    console.log(queriedLogs);
    var queriedQueued = await dbc.query(queuedQueryParams).promise();
    console.log(queriedQueued);
    if (queriedLogs.Items.length<1 && queriedQueued.Items.length<1) return response(200,"No orders currently on the exchange")
  }
  catch(err){
    console.log(err);
    return response(500,err);
  }
  
  let betLogs = [];
  let openBets = [];
  queriedLogs.Items.forEach(item=>{
      
      betLogs.push({
          eventId:item.PK.replace("#log",""),
          betId:item.SK.split("#")[1],
          side:item.side,
          stake:item.stake,
          matches:item.matched
      });
      
  });
  
  queriedQueued.Items.forEach(item=>{
      
      openBets.push({
          eventId:item.PK,
          betId:item.LSI.split("#")[1],
          side:item.side,
          stake:item.stake,
          price:item.price,
          status:"unMatched"
      });
      
  });
    
    return response(200,{open:openBets,logged:betLogs});
    
};


function response(statusCode, message){
  return{
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}