# user_system_with_jwt_postgresql

Basic User System

This is an REST API developed using Node.js and PostgreSQL daabase.


To configure

Authentication
In the file config/auth.json is found the property secret, a MD5 hash, needed to generate the jwt token.

Database
In the file config/database.js are found the properties for database conection.
For this example, I used the PostgreSQL (dialect: 'postgres').

Mailer
In the file config/mail.json are found the properties needed to send email.
For this example, I used the mailtrap.io, that receive all email send.
It was used SMTP.
More info about conection with mailtrap.io can be found in https://help.mailtrap.io

Server
In the file config/server.json is found the property port, where the API will to listen for connections.


To install packages:
npm install

Database creation
To create the database is need execute the migrations.
After configure the database, run the folowing commands:
npx sequelize db:create
npx sequelize db:migrate

To execute:
node src/index.js