const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = "Exchange";

exports.handler = async (event) => {

    const request = JSON.parse(event.body);
    const time=Date.now();
    const paramsIn = {
    TableName:exchangeTable,
    Item:{
      PK:"event",
      SK:"ev#"+time,
      description:request.description,
      creator:request.userId
    }
  };
  
  try{
    const data = await dbc.put(paramsIn).promise();
    console.log(data);
    return response(200,{eventStatus:"Created", eventId:"ev#"+time, description:request.description});
  }
  catch(err){
    console.log(err);
    return response(500,"Failed to create the event");
  }  
};



function response(statusCode, message){
  return{
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}
