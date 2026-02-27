const mongoose = require("mongoose");
const Users = require("../models/signup.js");
const usersData = require("./usersData.js");

async function main(){
  await mongoose.connect('mongodb://127.0.0.1:27017/sirius');
}

main()
.then(()=>{console.log("Connected successfully")})
.catch((err)=>{console.log(err)});


const addUsers = async() =>{
   await Users.deleteMany({});
   Users.insertMany(usersData.data).then(()=>{
    console.log("Successfully inserted data");
   }).catch((err)=>{
    console.log(err);
   })
}

addUsers();
