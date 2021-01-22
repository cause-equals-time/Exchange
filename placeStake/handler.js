'use strict';

const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();


module.exports.handler = async (event) => {
  
  const requestBody = JSON.parse(event.body);
  const table = requestBody.eventId;
  const side = requestBody.side;
  const price = requestBody.price;
  const stake = requestBody.stake;
  
  
  let backArray = [];
  let layArray = [];
  

  const paramsOut = {
    TableName:table,
    Key:{
      price:price
    }
  };
  
  try{
    const data = await dbc.get(paramsOut).promise();
    console.log(data);
    if (data.Item.lay!=undefined) layArray=data.Item.lay;
    if (data.Item.back!=undefined) backArray=data.Item.back;
  }
  catch(err){
    console.log(err);
    return response(500,err);
  }
  
  let matchStatus;
  let responsability;
  let profit;
  let remainder;
  //If trying to lay
  if (side===0){
    //If there is no available money on back at the chosen price, send lay stake to the queue
  
      //If there is money available on back, consume stakes from the back queue until the stake to be placed is matched or there is no more money to match it entirely, 
      //in which case the remainder is sent to the lay queue. If there is no money available, the stake is sent to the lay queue entirely.
      
      remainder = consumeStakes(backArray,stake);
      responsability=(stake-remainder)*(price-1);
      profit=stake-remainder;
      matchStatus=getMatchStatus(stake,remainder);
      if (remainder!=0) layArray.push(remainder);
      
      
  }
  //if trying to back, same logic
  else{
   
      remainder = consumeStakes(layArray,stake);
      responsability=stake-remainder;
      profit=(stake-remainder)*(price-1);
      matchStatus=getMatchStatus(stake,remainder);
      if (remainder!=0) backArray.push(remainder);
      
  } 
   
  
  const paramsIn = {
    TableName:table,
    Item:{
      price:price,
      lay:layArray,
      back:backArray
    }
  };
  
  try{
    const data = await dbc.put(paramsIn).promise();
    console.log(data);
  }
  catch(err){
    console.log(err);
    return response(500,err);
  }
  
    const status = {
        status: matchStatus,
        responsability: responsability,
        profit: profit,
        queued: remainder,
        action: requestBody
    };
    return response(200,status);
  
  };
  
  
  
  function consumeStakes(side,stake){
            let sum=0;
            while (sum<stake && side.length>0){
                sum+=side.shift();
            }

            if (sum<stake) return stake-sum;
            if (sum>stake){
                side.unshift(sum-stake);
            }
            return 0;
        }
  
  
  function getMatchStatus(stake,remainder){
    if (remainder===0) return "fullyMatched";
    if (remainder<stake) return "partiallyMatched";
    return "unMatched";
  }
  
  function response(statusCode, message){
  return{
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}
