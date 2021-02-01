const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = "Exchange";

exports.handler = async (event) => {
    
    //const request = JSON.parse(event.body);
    //const userId = request.userId;
    
    
    let params = {
    TableName : exchangeTable,
    ScanIndexForward: true,
    KeyConditionExpression: "PK = :event",
    ExpressionAttributeValues: {
                ":event": "event"
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

return response(200,generateEventArray(queriedData.Items));

};


function generateEventArray(events){
    
    let eventList = [];
    events.forEach(event=>{
       
       eventList.push({eventId:event.SK, description:event.description});
        
    });
    return eventList;
    
}

function response(statusCode, message){
  return{
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}