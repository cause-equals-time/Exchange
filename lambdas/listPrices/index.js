const AWS = require('aws-sdk');
const dbc = new AWS.DynamoDB.DocumentClient();
const exchangeTable = process.env.TABLE_NAME;

exports.handler = async (event) => {
    
    const request = JSON.parse(event.body);
    const ev = request.eventId;
    
    
    let params = {
    TableName : exchangeTable,
    ScanIndexForward: true,
    KeyConditionExpression: "PK = :event",
    ExpressionAttributeValues: {
                ":event": ev
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

if (queriedData.Items.length>0) return response(200,generatePriceArray(queriedData.Items));
return response(200,[]);
};


function generatePriceArray(marketStakes){
    
    let sum=0;
    let market = [];
    let sideHolder = marketStakes[0].side;
    let priceHolder = marketStakes[0].price;
    marketStakes.forEach(order=>{
        if (order.price===priceHolder) {
            sum+=order.stake;
        }
        else{
            market.push({price:priceHolder, side:sideHolder, ammount:sum});
            sum=order.stake;
            priceHolder=order.price;
            sideHolder=order.side;
        }
    });
    market.push({price:priceHolder, side:sideHolder, ammount:sum});
    
    return market;
    
}


function response(statusCode, message){
  return{
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}