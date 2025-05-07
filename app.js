const express = require("express");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const chalk = require("chalk");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const nodemailer = require("nodemailer");
const User = require("./src/models/User");
const moment = require("moment");
const geoip = require('geoip-lite'); 


const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

const { google } = require("googleapis");


const cron = require("node-cron");

const ejs = require("ejs");

const Package_Info = require("./src/models/package_info")


const ReferralCodeReceiver = require("./src/models/Reffarel_Code_from_reciver");
const ReferralCode = require("./src/models/Reffarelcode_from_sender");

const mongoose = require("mongoose");
const admin = require("firebase-admin");

const Withdrawal = require("./src/models/WithdrawalRequest");

const Payment = require("./src/models/package_confirmation"); // Import your Payment model

const ContactMessage = require("./src/models/contactData");


const axios = require("axios");

const couponRoutes = require("./src/routes/couponRoutes");
const accountRoutes = require("./src/routes/accountRoutes");

const withdrawalRoutes = require("./src/routes/withdrawalRoutes");

const RecentActivityModels = require("./src/models/RecentActivity");

const withdrawal_Status = require("./src/routes/withdrwalStatus")

dotenv.config();


const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");



const app = express();
const PORT = 6000;


// 🔐 Apply security middlewares
app.use(helmet()); // set secure headers
app.use(xss()); // clean user input from malicious code
app.use(mongoSanitize()); // prevent mongo injection

// 🛡️ Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes.",
});
app.use(limiter);


// HTTP Server and Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URI,
      process.env.ADMIN_URI,
      process.env.EXEPTIONAL_URL_1,
      process.env.EXEPTIONAL_URL_2,
      process.env.EXEPTIONAL_URL_3,
      "http://localhost:8200",
      "https://server.kivicoin.com",
      "https://server.kivicoin.com",
      " http://127.0.0.1:5500",
    ], // Frontend origins
    methods: ["GET", "POST"],
  },
});

const corsOptions = {
  origin: [
    process.env.CLIENT_URI,
    process.env.ADMIN_URI,
    "https://server.kivicoin.com",
    "http://localhost:8200",
    "https://server.kivicoin.com",
    process.env.EXEPTIONAL_URL_1,
    process.env.EXEPTIONAL_URL_2,
    process.env.EXEPTIONAL_URL_3,
    "http://127.0.0.1:5500",
    "https://sandbox.nowpayments.io/",
    "https://api.nowpayments.io/",
    "https://api.nowpayments.io/v1/",
    "https://sandbox.nowpayments.io/v1/",
  ],
  methods: ["GET", "POST", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"], // ✅ Add Authorization here
  credentials: true, // যদি cookie/token পাঠাও
};

app.use(cors(corsOptions));

// MongoDB connection
const mongoDb = mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));



// Middleware

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");




// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public/dashboard", "index.html"));
// });




 const Default_packages = [
  
  {
    Package_Name: "Starter Plan",
    Return_Persentage: 5,
    Time_Every: "Every Day",
    For__time: "30 Days",
    Capital_span: "Included",
    price: 100, // Ensure price is a number, not a string
    package_genarative_secret: "someSecret123"
  },
  // Add more packages here
];


app.get("/packages/data", async (req, res) => {
  try {
    const Packages_data = await Package_Info.find();

    if (Packages_data.length === 0) {
      // Make sure Default_packages is defined correctly
      await Package_Info.insertMany(Default_packages);
      return res.json({ msg: "This is packages data", data: Default_packages });
    }

    res.json(Packages_data);
  } catch (error) {
    console.error("Error occurred:", error);
    res
      .status(500)
      .json({ error: "Something went wrong", message: error.message });
  }
});

app.post("/packages/add", async (req, res) => {
  const newPackage = req.body;

  const {
    Package_Name,
    Return_Persentage,
    Time_Every,
    For__time,
    price,
    package_genarative_secret,
  } = newPackage;

  try {
    // Check if the package already exists
    const updatedPackage = await Package_Info.findOneAndUpdate(
      { Package_Name }, // Find the package by name
      {
        Return_Persentage,
        Time_Every,
        For__time,
        price,
        package_genarative_secret,
      }, // Update the package data
      { new: true, upsert: true } // `new: true` returns the updated document, `upsert: true` creates the document if it doesn't exist
    );

    if (updatedPackage) {
      return res
        .status(200)
        .json({
          message: "Package successfully updated!",
          data: updatedPackage,
        });
    } else {
      // If no package is found, it will be created as a new one due to `upsert: true`
      return res
        .status(201)
        .json({
          message: "New package created successfully!",
          data: updatedPackage,
        });
    }
  } catch (error) {
    console.error("Error adding or updating package:", error);
    res
      .status(500)
      .json({
        message: "Error adding or updating the package",
        error: error.message,
      });
  }
});


// Socket.io connection
io.on("connection", async (socket) => {

   console.log("Socket connected")

    try {
      const totalPackages = await Package_Info.estimatedDocumentCount();
      socket.emit("total-packages", totalPackages);
    } catch (error) {
      console.error(error);
    }
 

  socket.on("package-name" , async (packageName) =>{


    try {

      const Package_data = await Package_Info.findOne({Package_Name : packageName});

      socket.emit("founded-data" , Package_data)
      
    } catch (error) {
      
    }
    







  });


socket.on("user-email", async (UserEmail) => {
  try {
    const User_data = await User.findOne({ email: UserEmail }); // Search by email
    if (User_data) {
      socket.emit("user-data", User_data);
    } else {
      console.log("User not found for email:", UserEmail);
    }
  } catch (error) {
    console.error("Error fetching user:", error);
  }
});




  try {
    const totalUsers = await User.estimatedDocumentCount();
    socket.emit("total-users", totalUsers);
  } catch (error) {
    console.error(error);
  }

  socket.emit("message", "Hello World from server");
});




// Routes
// Home Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/packages/add/new", async (req, res) => {
  const {
    Package_Name,
    Order_ID,
    Return_Persentage,
    To_Return_Persentage,
    Duration,
    duration_value,
    For__time,
    Capital_span,
    package_genarative_secret,
    min_amount,
    max_amount,
    Details, // ✅ New field
  } = req.body;

  // Validate required fields
  if (
    !Package_Name ||
    !Order_ID ||
    !Return_Persentage ||
    !To_Return_Persentage ||
    !Duration ||
    !duration_value ||
    !For__time ||
    !Capital_span ||
    !package_genarative_secret ||
    !min_amount ||
    !max_amount
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (min_amount > max_amount) {
    return res
      .status(400)
      .json({ message: "Minimum amount cannot be greater than maximum amount." });
  }

  try {
    const start_date = new Date();
    const end_date = moment(start_date)
      .add(duration_value, Duration.toLowerCase()) // 'month' or 'year'
      .toDate();

    const getNextProfitDue = (base, interval) => {
      switch (interval) {
        case "Daily":
          return moment(base).add(1, "days").toDate();
        case "Every Week":
          return moment(base).add(7, "days").toDate();
        case "Every-Month":
          return moment(base).add(1, "months").toDate();
        default:
          return base;
      }
    };

    const next_profit_due = getNextProfitDue(start_date, For__time);

    const payload = {
      Package_Name,
      Order_ID,
      Return_Persentage,
      To_Return_Persentage,
      Duration,
      duration_value,
      For__time,
      Capital_span,
      min_amount,
      max_amount,
      package_genarative_secret,
      start_date,
      end_date,
      next_profit_due,
      Details: Details || "", // ✅ Add Details if present
    };

    const existingPackage = await Package_Info.findOne({ Package_Name });

    if (existingPackage) {
      const updatedPackage = await Package_Info.findOneAndUpdate(
        { Package_Name },
        payload,
        { new: true }
      );
      return res.status(200).json({
        message: "Package successfully updated!",
        data: updatedPackage,
      });
    } else {
      const newPackage = new Package_Info(payload);
      await newPackage.save();

      return res.status(201).json({
        message: "New package created successfully!",
        data: newPackage,
      });
    }
  } catch (error) {
    console.error("❌ Error creating/updating package:", error.message);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

app.get("/referral/:refer_code", async (req, res) =>{

  const { referralCode } = req.params; 
  
  const refferal_Code =  Refferrel_Code.findOne({
    Refferal_Code: referralCode
  });






  console.log(refferal_Code);

})

app.post("/referral", async (req, res) =>{

  const { referralCode } = req.body; ;

  const refferal_Code = new Refferrel_Code({ Refferal_Code: referralCode });

  await refferal_Code.save()

  console.log(referralCode);

})


app.delete("/packages/delete/:Package_Name", async (req, res) => {
  const { Package_Name } = req.params;

  try {
    const deletedPackage = await Package_Info.findOneAndDelete({
      Package_Name: Package_Name,
    });
    if (!deletedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }
    res.status(200).json({ message: "Package successfully deleted!" });
  } catch (error) {
    console.error("Error deleting package:", error); 
    res
      .status(500)
      .json({ message: "Error deleting package", error: error.message });
  }
});



const SMTP_USER = process.env.SMTP_USER ;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST;




// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST, 
  port: 465,
  secure: true, // true for SSL (465), false for TLS (587)
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

// Registration Route with Email Verification
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input fields
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Please fill all fields" });
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a verification token (expires in 1 day)
    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Create new user with isAutherised false and store the token
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isAutherised: false,
      verificationToken,
    });

    // Save the user to the database
    await newUser.save();

    // Construct the verification link (adjust the URL if needed)
    const verificationLink = `https://server.kivicoin.com/verify/${verificationToken}`;

    // Email options
   const mailOptions = {
     from: process.env.EMAIL_USER,
     to: email,
     subject: "Verify Your Email - Kivicoin",
     html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <div style="background-color: #000; padding: 20px; text-align: center;">
          <img src="https://kivicoin.com/assets/images/logo.png" alt="Kivicoin Logo" style="width: 150px;">
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">
            Thank you for registering with Kivicoin. Please verify your email address by clicking the button below.
          </p>
          <p style="text-align: center; margin: 40px 0;">
            <a href="${verificationLink}" style="background-color: #ff9100; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">
              Verify Email
            </a>
          </p>
          <p style="color: #777; font-size: 14px; line-height: 1.5;">
            This verification link will expire in 24 hours. If you did not request this, please ignore this email.
          </p>
        </div>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999;">
          <p>&copy; ${new Date().getFullYear()} Kivicoin. All rights reserved.</p>
        </div>
      </div>
    </div>
  `,
   };


    // Send the verification email
    await transporter.sendMail(mailOptions);

    // Respond with a message
    res.status(201).json({ msg: "User registered successfully! Check your email for verification." });



    
const UserActivity = new RecentActivityModels({
  email: email,
  activity_type: `New User Registered : ${name}`,
});
await UserActivity.save();

    console.log("User activity saved:", UserActivity);




    
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// Email Verification Route

app.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by email
    const user = await User.findOne({ email: decoded.email });
    if (!user) { 
      return res
        .status(400)
        .json({ msg: "Invalid token or user does not exist" });
    }

    // If already verified
    if (user.isAutherised) {
      return res.redirect(
        `https://server.kivicoin.com/emailVerified/${decoded.email}`
      );
    }

    // Update user status and remove verification token
    user.isAutherised = true;
    user.verificationToken = null;
    user.balance = 10; // direct eikhanei set kore nilam
    await user.save();

    // Redirect to frontend confirmation page
    return res.redirect(`http://localhost:3000/emailVerified/${decoded.email}`);
  } catch (error) {
    console.error("Verification Error:", error);
    return res.status(400).json({ msg: "Invalid or expired token" });
  }
});


// The code you provided is now saved as your editable canvas file.
// This is the full backend server code for your investment/finance platform.
// You can now ask me to edit, debug, refactor, optimize or document any part of it.

// Let's begin editing whenever you're ready!

// [... previous code remains unchanged ...]

// Login Routeconst geoip = require('geoip-lite'); // install this with: npm install geoip-lite

app.post('/login', async (req, res) => {
  const { email, password, deviceId } = req.body; // deviceId must come from frontend

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials!' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const user_id = user._id;
    const user_email = user.email;

    // Detect device info
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geo = geoip.lookup(ipAddress) || {};

    const location = `${geo.city || 'Unknown City'}, ${geo.region || ''}, ${geo.country || ''}`;

    // Send login email notification
    const loginMailOptions = {
      from: process.env.EMAIL_USER,
      to: user_email,
      subject: 'Login Notification - Kivicoin',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <h2 style="color: #333;">Hi ${user.name || 'User'},</h2>
          <p style="color: #555;">You just logged into your Kivicoin account. If this was not you, please contact support immediately.</p>
          <p><strong>Device:</strong> ${userAgent}</p>
          <p><strong>Device ID:</strong> ${deviceId || 'Not Provided'}</p>
          <p><strong>IP:</strong> ${ipAddress}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p style="font-size: 12px; color: #aaa;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(loginMailOptions);
      console.log("Login email sent to:", user_email);
    } catch (mailErr) {
      console.error("Failed to send login email:", mailErr);
    }

    return res.json({
      success: true,
      user_id,
      user_email,
      token,
      device: userAgent,
      ip: ipAddress,
      location,
      deviceId: deviceId || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong!', error });
    console.log(error)
  }
});

// [... remaining code continues ...]


// Get total users
app.get("/total-users", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.status(200).json({ totalUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
});

const fakeData = {
  name: "John Doe",
  email: "john.doe@example.com",
  package_name: "Diamond",
  package_genarative_secret: "abc123xyz",
  package_price: "500",
  package_duration: "12 months",
  package_status: "Active",
  package_start_date: "2025-01-01",
  package_end_date: "2025-12-31",
  discount: "10%",
  is_Authorised: "Yes",
  total_investment: 5000,
  total_profit: 1000,
};


app.post("/package/verification", (req, res) => {
  console.log("Received Data:", req.body);

  if (!req.body.email) {
    return res.status(400).json({ error: "Email is required!" });
  }


  const { email } = req.body; 



  res.json({ message: "Email received successfully!", data: fakeData });
});


console.log(process.env.NOWPAYMENTS_API_KEY);

 const NOWPAYMENT_URL = process.env.NOWPAYMENT_URL;
 const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;

app.post("/create-payment", async (req, res) => {

  

  try {
    const { Product_Name, amount, email, Order_ID } = req.body;

    // Input validation
    if (!Product_Name || !amount || !email || !Order_ID) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const data = JSON.stringify({
      price_amount: amount,
      price_currency: "usd",
      order_id: Order_ID,
      order_description: Product_Name,
      ipn_callback_url: "https://server.kivicoin.com/ipn/",
      success_url: `https://server.kivicoin.com/success?email=${encodeURIComponent(
        email
      )}`,
      cancel_url: "https://client.kivicoin.com",
    });

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: NOWPAYMENT_URL,
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      data: data,
    };;

    const response = await axios(config);
   

    // Log response for debugging
    console.log("Payment response:", response.data);

    // Send invoice URL back to the client
    res.status(200).json({ invoice_url: response.data.invoice_url });
  } catch (error) {
    console.error(
      "Payment request error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error:
        "An error occurred while processing the payment. Please try again later.",
    });
  }
});


app.post("/create-payment/deposite", async (req, res) => {
  try {
    const { Product_Name, amount, email, Order_ID } = req.body;

    console.log(Product_Name, amount, email, Order_ID);

    // Input validation
    if (!Product_Name || !amount || !email || !Order_ID) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }


   const data = {
     price_amount: Number(amount), // Convert string to number
     price_currency: "usd",
     order_id: Order_ID,
     order_description: Product_Name,
     ipn_callback_url: "http://localhost:3000/payment-status",
     success_url: `https://server.kivicoin.com/success/deposite?email=${encodeURIComponent(
       email
     )}`,
     cancel_url: "https://server.kivicoin.com",
   };

    if (!process.env.NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ error: "Payment API key is missing" });
    }


    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: NOWPAYMENT_URL,
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      data: data,
    };

    const response = await axios(config);
   

    // Log response for debugging
    console.log("Payment response:", response.data);

    // Send invoice URL back to the client
    res.status(200).json({ invoice_url: response.data.invoice_url });
  } catch (error) {
    console.error(
      "Payment request error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error:
        "An error occurred while processing the payment. Please try again later.",
    });
  }
});









app.post("verify/order/confirmations" , (req, res) => {





var config = {
  method: "get",
  maxBodyLength: Infinity,
  url: `${process.env.NOWPAYMENT_URL}/v1/payment/5603601336`, // Use the provided NPid
  headers: {
    "x-api-key": process.env.NOWPAYMENTS_API_KEY, // Replace with your actual API key
  },
};

axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data)); // Log the response data
  })
  .catch(function (error) {
    console.log(error); // Log any errors
  });







})







app.post("/ipn", (req, res) => {
  const paymentData = req.body;

  // Log the payment data for debugging
  console.log(paymentData);

  // Create a new payment record in the database
  const payment = new Payment({
    Order_ID: paymentData.order_id,
    status: paymentData.status,
    price_amount: paymentData.price_amount,
    price_currency: paymentData.price_currency,
    pay_currency: paymentData.pay_currency,
    payment_amount: paymentData.payment_amount,
    payment_status: paymentData.payment_status,
    transaction_id: paymentData.transaction_id,
    datetime: new Date(paymentData.datetime), // Convert string to Date object
    ipn_version: paymentData.ipn_version,
    buyer_email: paymentData.buyer_email,
    buyer_name: paymentData.buyer_name,
    fee: paymentData.fee,
  });

  payment
    .save()
    .then(() => {
      // Successfully saved payment data
      res.status(200).send("Payment data saved successfully");
    })
    .catch((error) => {
      // Handle any errors that occur while saving
      console.error("Error saving payment data:", error);
      res.status(500).send("Error saving payment data");
    });
});



app.post("/success/deposite", async (req, res) => {
  const { email, NP_id } = req.query;

  if (!email || !NP_id) {
    return res.status(400).json({ error: "Email and NP_id are required" });
  }

  // Log the payment attempt for debugging
  console.log(`Payment successful for: ${email} and NP_id: ${NP_id}`);

  try {
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${NOWPAYMENT_URL}/${NP_id}`,
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY, // Use environment variable for API key
      },
    };

    // Make the API request to get payment details
    const response = await axios(config);
    const paymentData = response.data;

    // Log the payment response for debugging
    console.log("Payment details:", paymentData);

   

    

    const depositeBalance = paymentData.price_amount; 
    const userBalance = user.balance ;

    const NewBalance = userBalance + depositeBalance;

    user.balance = NewBalance;

    await user.save();


    // Response message
    res.status(200).json({
      message: "Payment Successful!",
      email: email,
      paymentId: paymentData.payment_id,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal Server Error Sontu be montu be" });
  }
});





app.post("/success", async (req, res) => {
  const { email, NP_id } = req.query;

  if (!email || !NP_id) {
    return res.status(400).json({ error: "Email and NP_id are required" });
  }

  // Log the payment attempt for debugging
  console.log(`Payment successful for: ${email} and NP_id: ${NP_id}`);

  try {
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${NOWPAYMENT_URL}/${NP_id}`,
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY, // Use environment variable for API key
      },
    };

    // Make the API request to get payment details
    const response = await axios(config);
    const paymentData = response.data;

    // Log the payment response for debugging
    console.log("Payment details:", paymentData);

    if (!paymentData || !paymentData.order_description) {
      return res.status(400).json({ error: "Invalid payment data" });
    }

    const packageData = await Package_Info.findOne({
      Package_Name: paymentData.order_description,
    });

    // Create the payment info object
    const paymentInfo = {
      Package_Name: paymentData.order_description,
      Order_ID: paymentData.order_id,
      Payment_ID: paymentData.payment_id,
      Return_Persentage: packageData.Return_Persentage || 0,
      To_Return_Persentage: packageData.To_Return_Persentage || 0,
      total_investment: paymentData.price_amount,
      total_profit: paymentData.total_profit,
      Time_Every: packageData.Time_Every || "Every Time",
      For__time: packageData.For__time || "1 Year",
      Capital_span: packageData.Capital_span || "Every Time",
      price: paymentData.price_amount,
      package_genarative_secret: paymentData.pay_address || "dasd",
    };

    // Check if the package already exists in the user's packages array
    const existingPackage = user.packages.find(
      (pkg) => pkg.Order_ID === paymentInfo.Order_ID
    );

    if (existingPackage) {
      return res.status(400).json({ error: "Package already added" });
    }

    // Push the new package to the user's packages array
    user.packages.push(paymentInfo);

    await user.save(); // Save updated user data

    const total_investment = user.total_investment;

    const packagetotal_investment = paymentInfo.price;

    const Newtotal_investment = total_investment + packagetotal_investment;

    user.total_investment = Newtotal_investment;

    await user.save();

    // Response message
    res.status(200).json({
      message: "Payment Successful!",
      email: email,
      paymentId: paymentInfo.payment_id,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});













app.post("/packages/data/register/user", async (req, res) => {
  const { email } = req.body;

  

  try {
    // Find user by email
    const user = await User.findOne({ email: email });
  

    if (user) {

            res.status(200).json(user); // Send the updated user object as a response
    } else {
      console.log("User not found");
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.log("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// Update package
app.post("/packages/update", async (req, res) => {
  const {
    Package_Name,
    Order_ID,
    Return_Persentage,
    To_Return_Persentage,
    price,
    package_generative_secret,
  } = req.body;
console.log(req.body)
  try {
    const updatedPackage = await Package_Info.findOneAndUpdate(
      { Package_Name },
      {
        Order_ID,
        Return_Persentage,
        To_Return_Persentage,
        price,
        package_generative_secret,
      },
      { new: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.json({ message: "Package updated successfully", updatedPackage });
  } catch (error) {
    res.status(500).json({ message: "Error updating package", error });
  }
});

// Delete package


app.post("/ipn-handler", (req, res) => {
  const receivedSig = req.headers["x-nowpayments-sig"];
  const payload = JSON.stringify(req.body, Object.keys(req.body).sort());
  const hmac = crypto.createHmac("sha512", "rMVKRteA+ivhlfzufxi3UOR76m33Ba3O");
  hmac.update(payload);
  const calculatedSig = hmac.digest("hex");

  if (receivedSig === calculatedSig) {
    const paymentStatus = req.body.payment_status;
    const orderId = req.body.order_id;

    if (paymentStatus === "finished") {
      // Update user profile based on orderId
      console.log(`Payment successful for user: ${orderId}`);
      // Implement your profile update logic here
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});



app.post("/reffarel_code/add", async (req, res) => {
  const { referralCode } = req.body;

  try {
    const newReferralCode = new ReferralCode({ referralCode });

    await newReferralCode.save();

    console.log(newReferralCode);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/referral/check", async (req, res) => {
  const { referralCode } = req.body;

  try {
    const newReferralCode = await ReferralCode.findOne({ referralCode });

    if (newReferralCode) {
      return res.status(200).json({ message: "Valid" });
    }

    return res.status(404).json({ message: "Invalid referral code" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/reffercode", async (req, res) => {
  try {
    const { code } = req.body;
    const newReferralCode = new ReferralCodeReceiver({ referralCode: code });
    await newReferralCode.save();
    console.log("Successfull");
  } catch (error) {
    console.log(error);
  }
});

app.post("/coupon", async (req, res) => {
  const { coupon } = req.body; // Coupon code received in request body
console.log(coupon)
  try {
    const { coupon } = req.body; // Coupon code received in request body
    const referralCode = await ReferralCodeReceiver.findOne({
      referralCode: coupon,
    });

    if (referralCode) {
      return res.status(200).send({
        message: "Referral code applied successfully",
        referralCode: referralCode.referralCode,
        persentage: referralCode.persentage , // Default 10% if not provided
      });
    }

    return res.status(404).send({ message: "Referral code not found!" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Something went wrong!" });
  }
});




app.post("/google/auth/kiviuser/data", async (req, res) => {
  const { uid, displayName, email, photoURL } = req.body;

  // Check if the required fields are provided
  if (!uid || !email || !displayName) {
    return res.status(400).json({ msg: "Missing required fields" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If the user exists, generate JWT token and respond
      const token = jwt.sign(
        { userId: existingUser._id, email: existingUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.status(200).json({
        msg: "User logged in successfully",
        token,
        success: true,
        user_id: uid,
        user_email: email,
      });
    } else {
      // If the user doesn't exist, create a new user
      const newUser = new User({ name: displayName, email, photoURL, uid });
      newUser.balance = 10; // Set initial balance for new user
      await newUser.save();

      const token = jwt.sign(
        { userId: newUser._id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.status(201).json({
        msg: "User created successfully via Google",
        token,
        success: true,
        user_id: uid,
        user_email: email,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
});


app.post("/user/data/email", async (req, res) => {
  try {
    const { UserEmail } = req.body;

    // Validate email input
    if (
      !UserEmail ||
      typeof UserEmail !== "string" ||
      !UserEmail.includes("@")
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    console.log("Fetching data for email:", UserEmail);

    // Find user with proper error handling
    const user = await User.findOne({ email: UserEmail }).lean().exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't send sensitive data even if found
    const userData = {
      name: user.name,
      email: user.email,
      balance: user.balance,
      createdAt: user.createdAt,
      // Add other non-sensitive fields as needed
    };

    console.log("Found user:", userData.name);

    res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});


// ⏱️ Profit interval handler
const calculateNextProfitDate = (currentDate, intervalType) => {
  switch (intervalType) {
    case "Daily":
      return moment(currentDate).add(1, "days").toDate();
    case "Every Week":
      return moment(currentDate).add(7, "days").toDate();
    case "Every-Month":
      return moment(currentDate).add(30, "days").toDate();
    default:
      return currentDate; // fallback
  }
};

// 💸 Main profit distribution function
const processProfitDistribution = async () => {
  const users = await User.find({email: "ssnmggs@gmail.com"});

  for (const user of users) {
    let totalSessionProfit = 0;
    let updated = false;

    user.balance = isNaN(user.balance) ? 0 : user.balance;
    user.total_profit = isNaN(user.total_profit) ? 0 : user.total_profit;

    for (const pkg of user.packages || []) {
      if (
        !pkg.price || isNaN(pkg.price) ||
        !pkg.persentage || isNaN(pkg.persentage) ||
        !pkg.For__time || !pkg.start_date
      ) continue;

      pkg.total_profit = isNaN(pkg.total_profit) ? 0 : pkg.total_profit;

      if (!pkg.next_profit_due) {
        pkg.next_profit_due = calculateNextProfitDate(pkg.start_date, pkg.For__time);
      }

      if (new Date() >= new Date(pkg.next_profit_due)) {
        const profit = (pkg.price * pkg.persentage) / 100;

        if (!isNaN(profit) && profit > 0) {
          user.balance += profit;
          user.total_profit += profit;
          pkg.total_profit += profit;
          totalSessionProfit += profit;

          pkg.next_profit_due = calculateNextProfitDate(pkg.next_profit_due, pkg.For__time);
          updated = true;
        }
      }
    }

    if (updated) {
      try {
        await user.save();

        await transporter.sendMail({
          from: '"Kivicoin Profit" <verification@kivicoin.com>',
          to: user.email,
          subject: "🎉 Profit Credited to Your Account",
          html: `
            <div style="background:#111827; color:#f9fafb; padding:30px; font-family:Segoe UI, sans-serif; border-radius:10px;">
              <div style="text-align:center;">
                <img src="https://kivicoin.com/assets/images/logo.png" style="width:80px; margin-bottom:20px;" alt="Kivicoin Logo" />
                <h2 style="color:#facc15;">You've Got Profited!</h2>
                <p style="color:#d1d5db;">Hey ${user.name || "Investor"},</p>
                <p>Your investment just earned you:</p>
                <h3 style="color:#facc15;">💰 ${totalSessionProfit.toFixed(
                  2
                )} USDT</h3>
                <p>New balance: <strong>${user.balance.toFixed(
                  2
                )} USDT</strong></p>
                <p style="font-size:14px; color:#9ca3af;">Keep investing. Keep growing.</p>
                <p style="color:#facc15;"><strong>– The Kivicoin Team</strong></p>
              </div>
            </div>
          `,
        });

        console.log(`✅ Profit sent to ${user.email} | Amount: ${totalSessionProfit.toFixed(2)} USDT`);
      } catch (err) {
        console.error(`❌ Error for ${user.email}:`, err.message);
      }
    }
  }
};

// ⏲️ Cron Job: Run every midnight
cron.schedule("0 0 * * *", () => {
  console.log("💸 Running Daily Profit Distribution (CRON)...");
  processProfitDistribution();
});



app.post("/withdrawal/request", async (req, res) => {
  try {
    // Create new withdrawal
    const withdrawal = new Withdrawal(req.body);
    await withdrawal.save();


    console.log("Successfull Withdrwal Request")

    // Here you might want to:
    // 1. Deduct from user's balance
    // 2. Send confirmation email
    // 3. Notify admin, etc.

    res.status(201).send({
      message: "Withdrawal request received",
      withdrawal,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send({
      message: "Withdrawal request failed",
      error: error.message,
    });
  }
});


app.get("/users/data" , async (req, res) =>{

  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }

});


// Add this new route
app.post("/packages/update-package-percentage", async (req, res) => {
  try {
    const { packageName, newPercentage } = req.body;

    // Update all users who have this package
    const result = await User.updateMany(
      { "packages.Package_Name": packageName },
      { $set: { "packages.$[elem].persentage": newPercentage } },
      { arrayFilters: [{ "elem.Package_Name": packageName }] }
    );

    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ message: "Package not found or no changes made" });
    }

    res.status(200).json({ message: "Percentage updated successfully" });

    console.log("Percentage updated successfully for package:", packageName);
  } catch (error) {
    console.error("Error updating package percentage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.use("/api/coupons", couponRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/withdrawals", withdrawalRoutes);




// Helper to convert time string to milliseconds
function getExpiryTimeMs(timeString) {
  const amount = parseInt(timeString.slice(0, -1));
  const unit = timeString.slice(-1).toUpperCase(); // H or D

  if (unit === "H") return amount * 60 * 60 * 1000;
  if (unit === "D") return amount * 24 * 60 * 60 * 1000;
  return 0;
}

function isExpired(createdAt, timeLimit) {
  const expiryTimeMs = getExpiryTimeMs(timeLimit || "12H");
  const expiryTimestamp = new Date(createdAt).getTime() + expiryTimeMs;
  return Date.now() > expiryTimestamp;
}

// Updated route
app.post("/checkCoupon", async (req, res) => {
  try {
    const { coupon } = req.body;

    const couponData = await ReferralCodeReceiver.findOne({ referralCode: coupon });

    if (!couponData) {
      return res.status(404).json({ message: "❌ Invalid coupon code." });
    }

    // Check expiry
    if (isExpired(couponData.createdAt, couponData.time)) {
      return res.status(400).json({ message: "⚠️ Coupon has expired." });
    }

    return res.status(200).json({
      referralCode: couponData.referralCode,
      persentage: couponData.persentage || 10,
      message: "✅ Coupon applied successfully!",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



// routes/withdrawal.js


// Create a new withdrawal request
app.post("/api/withdrawal/request", async (req, res) => {
  try {
    const { email, amount, paymentMethod, details } = req.body;

    // Basic validation
    if (!email || !amount || !paymentMethod || !details) {
      return res.status(400).json({
        success: false,
        message: "Email, amount, payment method and details are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check balance
    if (amount > user.balance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    // Create withdrawal
    const withdrawalData = {
      userId: user._id,
      email,
      amount,
      paymentMethod,
      status: "pending",
    };

    // Add payment method details
    if (paymentMethod === "bank-transfer") {
      withdrawalData.bankDetails = details;
    } else if (paymentMethod === "paypal") {
      withdrawalData.paypalDetails = details;
    } else if (paymentMethod === "crypto") {
      withdrawalData.cryptoDetails = details;
    } else if (paymentMethod === "skrill") {
      withdrawalData.skrillDetails = details;
    }

    const withdrawal = new Withdrawal(withdrawalData);
    await withdrawal.save();

    // Update user balance (optional - you can do this after approval)
    // user.balance -= amount;
    // await user.save();

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      data: withdrawal,
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get user's withdrawals by email
app.get("/api/withdrawal/user-withdrawals", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find withdrawals for this user
    const withdrawals = await Withdrawal.find({ email })
      .sort({ createdAt: -1 })
      .limit(10);

    // Separate into pending and recent
    const pending = withdrawals.filter(
      (w) => w.status === "pending" || w.status === "processing"
    );

    const recent = withdrawals.filter(
      (w) =>
        w.status === "completed" ||
        w.status === "failed" ||
        w.status === "cancelled"
    );

    res.status(200).json({
      success: true,
      data: { pending, recent },
    });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Admin route to process withdrawals (optional)
app.patch("/api/withdrawal/:id/process", async (req, res) => {
  try {
    const { status, transactionId } = req.body;

    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found",
      });
    }

    withdrawal.status = status || withdrawal.status;
    withdrawal.transactionId = transactionId || withdrawal.transactionId;
    withdrawal.processedAt = new Date();

    await withdrawal.save();

    // If completed, you might want to update user balance here
    // Or if rejected, return funds to user balance

    res.status(200).json({
      success: true,
      message: "Withdrawal updated",
      data: withdrawal,
    });
  } catch (error) {
    console.error("Process withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// 1️⃣ Define the scopes
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// 2️⃣ Initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// 3️⃣ (Optional) Route to generate the consent URL
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  res.redirect(authUrl);
});

// 4️⃣ (Optional) Callback route to handle Google OAuth redirect
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('Tokens:', tokens); // <-- Save refresh_token securely in .env
    res.send('Authentication successful! You can close this tab.');
  } catch (err) {
    console.error('Error retrieving access token', err);
    res.status(500).send('Authentication failed');
  }
});

// 5️⃣ Set credentials manually if refresh_token is already available
oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});

// 6️⃣ API to fetch emails
app.get('/api/emails', async (req, res) => {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20
    });

    const messages = response.data.messages || [];
    const emails = [];

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      });

      const headers = email.data.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      emails.push({
        id: message.id,
        from,
        subject,
        date,
        snippet: email.data.snippet
      });
    }

    res.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const newMessage = new ContactMessage({
      name,
      email,
      message,
    });

    await newMessage.save();

    res
      .status(201)
      .json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong, please try again." });
  }
});


app.get("/api/contact/data" , async (req, res) =>{

  try {
    const messages = await ContactMessage.find();
    res.status(200).json(messages);

  }
  catch{
    res.status(500).json({error: "Failed to fetch messages"});
  }
  
})

app.get("/api/packages", async (req, res) => {
  try {
    const packages = await Package_Info.find({});
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: "Server error", message: error.message });
  }
});


app.get("/api/crypto-price", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur&include_24hr_vol=true"
    );
    res.json(response.data); // send it to frontend
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch crypto data" });
  }
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const resetToken = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetURL = `https://server.kivicoin.com/reset-password/${resetToken}`; // or use process.env.CLIENT_URL

    // ✅ Send Email
   await transporter.sendMail({
     from: `"Kivicoin Security" <verification@kivicoin.com>`,
     to: user.email,
     subject: "🔐 Reset Your Kivicoin Password",
     html: `
  <div style="background: #111827; padding: 30px; border-radius: 10px; font-family: 'Segoe UI', sans-serif; color: #f9fafb;">
    <div style="text-align: center;">
      <img src="https://kivicoin.com/assets/images/logo.png" alt="Kivicoin Logo" style="width: 100px; margin-bottom: 20px;" />
      <h2 style="color: #facc15; margin-bottom: 5px;">Reset Your Password</h2>
      <p style="color: #d1d5db;">We received a request to reset your password. Let’s get you a new one 🔐</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${resetURL}"
        style="background: linear-gradient(135deg, #facc15, #d97706); padding: 12px 24px; border-radius: 6px;
        color: #111827; text-decoration: none; font-weight: 600; display: inline-block;">
        🔁 Reset Password
      </a>
    </div>

    <div style="margin-top: 30px; font-size: 14px; color: #9ca3af;">
      <p>This link is valid for <strong>15 minutes</strong>. If you didn’t request this, you can safely ignore it.</p>
      <p style="margin-top: 20px;">– The <span style="color: #facc15;">Kivicoin</span> Security Team</p>
    </div>
    
    <hr style="margin-top: 30px; border: none; border-top: 1px solid #374151;">
    <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px;">
      <p>Kivicoin Digital Ltd. | © ${new Date().getFullYear()}</p>
      <p><a href="https://kivicoin.com" style="color: #9ca3af; text-decoration: none;">Visit our site</a></p>
    </div>
  </div>
  `,
   });


    res
      .status(200)
      .json({ message: "Password reset email sent successfully!" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error, try again later." });
  }
});


app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json({ message: "Password has been reset successfully!" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(400).json({ message: "Invalid or expired token." });
  }
});


// Server listening


module.exports = server;