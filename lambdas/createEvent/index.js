const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = process.env.TABLE_NAME;

exports.handler = async (event) => {

    const base64Url = event.headers['X-COG-AUTH'].split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    const decodedData = JSON.parse(Buffer.from(base64, 'base64').toString('binary'));

    const request = JSON.parse(event.body);
    const time=Date.now();
    const paramsIn = {
    TableName:exchangeTable,
    Item:{
      PK:"event",
      SK:"ev#"+time,
      description:request.description,
      creator:decodedData['cognito:username']
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
