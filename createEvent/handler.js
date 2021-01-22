'use strict';
const AWS = require('aws-sdk');

const db = new AWS.DynamoDB();
const dbc = new AWS.DynamoDB.DocumentClient();


module.exports.handler = async (event) => {

const tableName = "event"+Date.now();
const desc = JSON.parse(event.body).description;

const paramsDBcreation = {
  AttributeDefinitions: [
    {
      AttributeName: 'price',
      AttributeType: 'N'
    }
  ],
  KeySchema: [
    {
      AttributeName: 'price',
      KeyType: 'HASH'
    }
  ],
  BillingMode: 'PAY_PER_REQUEST',
  TableName: tableName,
  StreamSpecification: {
    StreamEnabled: false
  }
};


try{
    const data = await db.createTable(paramsDBcreation).promise();
    console.log("Table Created", data);
    
    const paramsEventReg = {
    TableName:"Events",
    Item:{
      eventId:tableName,
      description:desc
        }
    }
  
    try{
        const data = await dbc.put(paramsEventReg).promise();
        console.log(data);
        const response = {
        statusCode: 200,
        body: JSON.stringify(tableName),
    };
        return response;
    }
    catch(err){
        console.log(err);
        const response = {
        statusCode: 500,
        body: JSON.stringify(err),
    };
        return response;
    }
  }
catch(err){
    console.log(err);
    const response = {
        statusCode: 500,
        body: JSON.stringify(err),
    };
        return response;
  }
  
  
};
