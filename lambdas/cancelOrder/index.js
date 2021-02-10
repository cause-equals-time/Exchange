const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = process.env.TABLE_NAME;

exports.handler = async (event) => {
    
    const base64Url = event.headers['X-COG-AUTH'].split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    const decodedData = JSON.parse(Buffer.from(base64, 'base64').toString('binary'));
    
    const request =JSON.parse(event.body);
    const betId = decodedData['cognito:username'] + "#" + (request.betId || "");
    
    
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
    if (toCancel.length<1) return response(200,[]);
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