const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const Users = require("./models/signup.js");
const bcrypt = require("bcrypt");
const ExpressError = require("./ExpressError");
const Listings = require("./models/listings.js")
const methodOverride = require("method-override");

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(methodOverride('_method'))
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));

app.engine("ejs",ejsMate);

async function main(){
  await mongoose.connect('mongodb://127.0.0.1:27017/sirius');
}

main()
.then(()=>{console.log("Connected successfully")})
.catch((err)=>{console.log(err)});

app.get("/",(req,res)=>{
  res.render("pages/home.ejs")
})

app.get("/listings/today", async (req, res) => {
  try {
    const today = new Date();

    // Start of today (00:00:00)
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // End of today (23:59:59)
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const todaysListings = await Listings.find({
      deadline: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    res.render("pages/show.ejs", { listings: todaysListings });

  } catch (err) {
    res.send(err);
  }
});
app.get("/listings",async (req,res)=>{
   try{
    let listings = await Listings.find({});
    res.render("pages/show.ejs",{listings})
   }
   catch(err){
    res.send(err);
   }
})

app.get("/listings/pending",async(req,res)=>{
  const listings = await Listings.find({ status: "Pending" });
  res.render("pages/show.ejs",{listings});
})


app.post("/listings",async(req,res)=>{
  try{
    const listing = new Listings(req.body);
    await listing.save();
    res.redirect("/");
  }
  catch(err){
    res.send(err);
  }
})
app.get("/listings/new",(req,res)=>{
 res.render("pages/new.ejs");
})

app.get("/listings/:id",async(req,res)=>{
  const {id} = req.params;
  const listing = await Listings.findById(`${id}`);
  res.render("pages/individual",{listing});

})
app.delete("/listings/:id",async(req,res)=>{
  const {id} = req.params;
  await Listings.findByIdAndDelete(`${id}`);
  res.redirect("/");
})
app.get("/listings/:id/edit",async(req,res)=>{
  const {id} = req.params;
  const listing = await Listings.findById(`${id}`);
  res.render("pages/edit.ejs",{listing});

})
app.patch("/listings/:id",async(req,res)=>{
  const {id} = req.params;
  
  await Listings.findByIdAndUpdate(id,req.body);
 res.redirect("/");
})

app.get("/listing/complete/:time",async(req,res)=>{
  let {time} = req.params;
  res.render("pages/focus.ejs",{time});
})
app.get("/signup",(req,res)=>{
  res.render("pages/signup.ejs");
})


app.post("/signup",async(req,res)=>{
try{
  let {fullName,userName,email,password,confirmPassword} = req.body;
  console.log(req.body);
 
  if(password!=confirmPassword){
   throw new ExpressError(400,"Password do not match");
  }

  const check = await Users.findOne({email});
  if(check){
    throw new ExpressError(409,"Email already exists");
  }
   const hashedPassword = await bcrypt.hash(password, 10);

   const newUser = new Users({
      fullName,
      userName,
      email,
      password: hashedPassword,
    });
    await newUser.save();
      
    res.redirect("/");
}
catch(err){
  console.log(err);
  res.status(400).send("Some error occured!! try again")
}
}

 
)

app.get("/login",(req,res)=>{
  res.render("pages/login.ejs");
})

app.post("/login",async(req,res)=>{
  try{
    const {email,password} = req.body;
    const User = await Users.findOne({email});
    if(!User){
      throw new ExpressError(400,"User did not find");
    }
   const isMatch = await bcrypt.compare(password, User.password);
 if (!isMatch) {
     throw new ExpressError(400,"Invalid password");
    }

    res.redirect("/");
  }

catch(err){
  console.log(err);
  res.send("Error");
}
})
app.get("/focus",(req,res)=>{
  const time = false;
  res.render("pages/focus.ejs",{time});
})
app.use((req,res)=>{
  res.send("Page not found");
})
const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
