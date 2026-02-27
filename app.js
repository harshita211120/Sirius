const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(express.urlencoded({extend:true}));
app.use(express.static(path.join(__dirname,"public")));

app.engine("ejs",ejsMate);

async function main(){
  await mongoose.connect('mongodb://127.0.0.1:27017/beattechs');
}

main()
.then(()=>{console.log("Connected successfully")})
.catch((err)=>{console.log(err)});

app.get("/",(req,res)=>{
 res.render("pages/Error.ejs");
})

app.get("/signup",(req,res)=>{
  res.render("pages/signup.ejs");
})
let port = 8080;
app.listen(port,()=>{
  console.log("Server us running ar port 8080");
})