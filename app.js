const express = require("express");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const Users = require("./models/signup.js");
const bcrypt = require("bcrypt");
const ExpressError = require("./ExpressError");
const Listings = require("./models/listings.js");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/planify";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-in-production";
const IS_PRODUCTION = NODE_ENV === "production";

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

app.use(methodOverride('_method'))
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));

app.engine("ejs",ejsMate);

async function main(){
  await mongoose.connect(MONGO_URL);
}

main()
.then(()=>{console.log("Connected to MongoDB successfully")})
.catch((err)=>{
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// Session configuration
const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({
    mongoUrl: MONGO_URL,
    touchAfter: 24 * 3600,
    crypto: {
      secret: SESSION_SECRET
    }
  }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    maxAge: 1000 * 60 * 60 * 24 * 7  // 7 days
  }
};

app.use(session(sessionConfig));

const isListingOverdue = (listing) => {
  if (!listing || !listing.deadline || listing.status === "Completed") {
    return false;
  }

  return new Date(listing.deadline).getTime() < Date.now();
};

const getListingDisplayStatus = (listing) => {
  return isListingOverdue(listing) ? "Overdue" : listing.status;
};

const setFlash = (req, type, text) => {
  req.session.flash = { type, text };
};

const normalizeListingInput = (body) => ({
  title: body.title?.trim(),
  description: body.description?.trim() || "",
  category: body.category,
  deadline: body.deadline,
  estimatedMinutes: Number(body.estimatedMinutes),
  status: body.status === "Completed" ? "Completed" : "Pending"
});

// Authentication middleware
const isLoggedIn = (req, res, next) => {
  if(!req.session.user) {
    setFlash(req, "error", "Please login to continue.");
    return res.redirect('/login');
  }
  next();
};

// Middleware to make user available in templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  res.locals.isListingOverdue = isListingOverdue;
  res.locals.getListingDisplayStatus = getListingDisplayStatus;
  res.locals.currentPath = req.path;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.get("/",(req,res)=>{
  res.render("pages/home.ejs")
})

app.get("/listings/today", isLoggedIn, async (req, res) => {
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
      userId: req.session.user._id,
      deadline: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ deadline: 1 });

    res.render("pages/show.ejs", { 
      listings: todaysListings,
      pageTitle: "Today's Tasks",
      emptyTitle: "No tasks scheduled for today",
      emptyCopy: "You're all clear for today. Add a task or enjoy the breathing room."
    });

  } catch (err) {
    setFlash(req, "error", "Unable to load today's tasks.");
    res.redirect("/listings");
  }
});
app.get("/listings", isLoggedIn, async (req,res)=>{
   try{
    let listings = await Listings.find({
      userId: req.session.user._id
    }).sort({ deadline: 1, createdAt: -1 });
    res.render("pages/show.ejs",{
      listings,
      pageTitle: "All Tasks",
      emptyTitle: "No tasks yet",
      emptyCopy: "Start by adding your first task and building your workflow."
    })
   }
   catch(err){
    setFlash(req, "error", "Unable to load your tasks.");
    res.redirect("/");
   }
})

app.get("/listings/pending", isLoggedIn, async(req,res)=>{
  const listings = await Listings.find({ 
    userId: req.session.user._id,
    status: "Pending" 
  }).sort({ deadline: 1 });
  const activePendingListings = listings.filter((listing) => !isListingOverdue(listing));
  res.render("pages/show.ejs",{
    listings: activePendingListings,
    pageTitle: "Pending Tasks",
    emptyTitle: "No active pending tasks",
    emptyCopy: "Everything pending is either completed or already overdue."
  });
})


app.post("/listings", isLoggedIn, async(req,res)=>{
  try{
    const listing = new Listings({
      ...normalizeListingInput(req.body),
      userId: req.session.user._id
    });
    await listing.save();
    setFlash(req, "success", "Task created successfully.");
    res.redirect("/listings");
  }
  catch(err){
    setFlash(req, "error", err.message || "Unable to create task.");
    res.redirect("/listings/new");
  }
})
app.get("/listings/new", isLoggedIn, (req,res)=>{
 res.render("pages/new.ejs");
})

app.get("/listings/:id", isLoggedIn, async(req,res)=>{
  const {id} = req.params;
  const listing = await Listings.findById(`${id}`);
  if(!listing || listing.userId.toString() !== req.session.user._id.toString()) {
    setFlash(req, "error", "Task not found.");
    return res.redirect("/listings");
  }
  res.render("pages/individual",{listing});

})
app.delete("/listings/:id", isLoggedIn, async(req,res)=>{
  const {id} = req.params;
  const listing = await Listings.findById(id);
  if(!listing || listing.userId.toString() !== req.session.user._id.toString()) {
    setFlash(req, "error", "Task not found.");
    return res.redirect("/listings");
  }
  await Listings.findByIdAndDelete(`${id}`);
  setFlash(req, "success", "Task deleted successfully.");
  res.redirect("/listings");
})
app.get("/listings/:id/edit", isLoggedIn, async(req,res)=>{
  const {id} = req.params;
  const listing = await Listings.findById(`${id}`);
  if(!listing || listing.userId.toString() !== req.session.user._id.toString()) {
    setFlash(req, "error", "Task not found.");
    return res.redirect("/listings");
  }
  if (isListingOverdue(listing)) {
    setFlash(req, "error", "Overdue tasks cannot be edited.");
    return res.redirect(`/listings/${id}`);
  }
  res.render("pages/edit.ejs",{listing});

})
app.patch("/listings/:id", isLoggedIn, async(req,res)=>{
  const {id} = req.params;
  const listing = await Listings.findById(id);
  if(!listing || listing.userId.toString() !== req.session.user._id.toString()) {
    setFlash(req, "error", "Task not found.");
    return res.redirect("/listings");
  }
  if (isListingOverdue(listing)) {
    setFlash(req, "error", "Overdue tasks cannot be updated.");
    return res.redirect(`/listings/${id}`);
  }
  
  await Listings.findByIdAndUpdate(id,normalizeListingInput(req.body));
  setFlash(req, "success", "Task updated successfully.");
 res.redirect(`/listings/${id}`);
})

app.patch("/listings/:id/status", isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const listing = await Listings.findById(id);

  if(!listing || listing.userId.toString() !== req.session.user._id.toString()) {
    setFlash(req, "error", "Task not found.");
    return res.redirect("/listings");
  }

  const nextStatus = req.body.status === "Completed" ? "Completed" : "Pending";
  listing.status = nextStatus;
  await listing.save();
  setFlash(req, "success", nextStatus === "Completed" ? "Task marked as completed." : "Task moved back to pending.");

  res.redirect(req.get("referer") || `/listings/${id}`);
});

app.get("/listing/complete/:time", isLoggedIn, async(req,res)=>{
  let {time} = req.params;
  res.render("pages/focus.ejs",{time});
})
app.get("/login",(req,res)=>{
  if(req.session.user) {
    return res.redirect("/listings");
  }
  res.render("pages/login.ejs");
})

app.get("/signup",(req,res)=>{
  if(req.session.user) {
    return res.redirect("/listings");
  }
  res.render("pages/signup.ejs");
})

app.post("/signup",async(req,res)=>{
  try{
    let {fullName,email,password,confirmPassword} = req.body;
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
        email,
        password: hashedPassword,
      });
      await newUser.save();
      
      // Auto login after signup
      req.session.user = {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email
      };
      
      setFlash(req, "success", "Account created successfully.");
      res.redirect("/listings");
  }
  catch(err){
    console.log(err);
    setFlash(req, "error", err.message || "Some error occured!! try again");
    res.redirect("/signup");
  }
})

app.post("/login",async(req,res)=>{
  try{
    const {email,password} = req.body;
    const User = await Users.findOne({email});
    if(!User){
      throw new ExpressError(400,"User not found");
    }
   const isMatch = await bcrypt.compare(password, User.password);
 if (!isMatch) {
     throw new ExpressError(400,"Invalid password");
    }

    // Save user to session
    req.session.user = {
      _id: User._id,
      fullName: User.fullName,
      email: User.email
    };

    setFlash(req, "success", `Welcome back, ${User.fullName}.`);
    res.redirect("/listings");
  }

catch(err){
  console.log(err);
  setFlash(req, "error", err.message || "Error");
  res.redirect("/login");
}
})

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if(err) {
      return res.send("Error logging out");
    }
    res.redirect("/");
  });
})
app.get("/focus", isLoggedIn, (req,res)=>{
  const time = false;
  res.render("pages/focus.ejs",{time});
})
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: NODE_ENV
  });
});

app.use((req,res)=>{
  res.status(404).send("Page not found");
})

app.listen(PORT,()=>{
  console.log(`Server is running on port ${PORT}`);
})
