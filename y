version = 0.1
[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "exchangeCogAuth"
s3_bucket = "aws-sam-cli-managed-default-samclisourcebucket-c8smv7xrqzda"
s3_prefix = "exchangeCogAuth"
region = "eu-central-1"
confirm_changeset = true
capabilities = "CAPABILITY_IAM"
parameter_overrides = "tableName=\"ExchangeTable\" apiName=\"exchangeAPI\" cognitoUserPoolName=\"exchangeUserPool\" cognitoUserPoolClientName=\"exchangeUserPoolClient\" environment=\"dev\""
