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

const cron = require("node-cron");

const ejs = require("ejs");

const Package_Info = require("./src/models/package_info")


const ReferralCodeReceiver = require("./src/models/Reffarel_Code_from_reciver");
const ReferralCode = require("./src/models/Reffarelcode_from_sender");

const mongoose = require("mongoose");
const admin = require("firebase-admin");

const Withdrawal = require("./src/models/WithdrawalRequest");

const Payment = require("./src/models/package_confirmation"); // Import your Payment model

const axios = require("axios");

const couponRoutes = require("./src/routes/couponRoutes");
const accountRoutes = require("./src/routes/accountRoutes");

const RecentActivityModels = require("./src/models/RecentActivity");

dotenv.config();




const app = express();
const PORT = 6000;



// HTTP Server and Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URI, process.env.ADMIN_URI], // Frontend origins
    methods: ["GET", "POST"],
  },
});

const corsOptions = {
  origin: [
    process.env.CLIENT_URI,
    process.env.ADMIN_URI,
    "https://client.kivicoin.com",
    "https://sandbox.nowpayments.io/",
    "https://api.nowpayments.io/",
    "https://api.nowpayments.io/v1/",
    "https://sandbox.nowpayments.io/v1/",
    
  ], // Add both URLs here
  methods: ["GET", "POST", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type"],
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
    Time_Every,
    For__time,
    price,
    package_genarative_secret,
  } = req.body;

  // Validate the incoming data
  if (
    !Package_Name ||
    !Order_ID ||
    !Return_Persentage ||
    !To_Return_Persentage ||
    !Time_Every ||
    !For__time ||
    !price ||
    !package_genarative_secret
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if a package with the same name already exists
    const existingPackage = await Package_Info.findOne({ Package_Name });

    if (existingPackage) {
      // If the package exists, update it
      const updatedPackage = await Package_Info.findOneAndUpdate(
        { Package_Name },
        {
          Order_ID,
          Return_Persentage,
          To_Return_Persentage,
          Time_Every,
          For__time,
          price,
          package_genarative_secret,
        },
        { new: true } // Return the updated document
      );

      return res.status(200).json({
        message: "Package successfully updated!",
        data: updatedPackage,
      });
    } else {
      // If the package does not exist, create a new one
      const newPackage = new Package_Info({
        Package_Name,
        Order_ID,
        Return_Persentage,
        To_Return_Persentage,
        Time_Every,
        For__time,
        price,
        package_genarative_secret,
      });

      await newPackage.save();

      return res.status(201).json({
        message: "New package created successfully!",
        data: newPackage,
      });
    }
  } catch (error) {
    console.error("Error adding or updating package:", error);
    res.status(500).json({
      message: "Error adding or updating the package",
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



console.log(process.env.SMTP_HOST);;




// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: "kivicoin.com",
  port: 465,
  secure: true, // true for SSL (465), false for TLS (587)
  auth: {
    user:"verification@kivicoin.com",
    pass:"Kivicoin@Verification@Email@SECURITY@PASS@1234",
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
    const verificationLink = `https://client.kivicoin.com/verify/${verificationToken}`;

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
      return res.status(400).json({ msg: "Invalid token or user does not exist" });
    }

    // If already verified
    if (user.isAutherised) {
      return res.status(200).json({ msg: "Email verified" });
    }

    // Update user status and remove verification token
    user.isAutherised = true;
    user.verificationToken = null;
    await user.save();

    if (user.isAutherised === true){
      user.balance = 10;
      await user.save();
    }
      res.json({ msg: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(400).json({ msg: "Invalid or expired token" });
  }
});


// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

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
    const token = jwt.sign({ userId: user._id, email: user.email }, 'your_jwt_secret', { expiresIn: '1h' });

    const user_id = user._id;
    const user_email = user.email;

    // Send user data and token
    return res.json({
      success: true,
      user_id,
      user_email,
      token, // You may also want to send a JWT token here to manage authentication in future requests
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong!', error });
  }
});

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
      success_url: `https://client.kivicoin.com/success?email=${encodeURIComponent(
        email
      )}`,
      cancel_url: "https://client.kivicoin.com",
    });

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api-sandbox.nowpayments.io/v1/invoice",
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
     ipn_callback_url: "https://server.kivicoin.com/payment-status",
     success_url: `https://client.kivicoin.com/success/deposite?email=${encodeURIComponent(
       email
     )}`,
     cancel_url: "https://client.kivicoin.com",
   };

    if (!process.env.NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ error: "Payment API key is missing" });
    }


    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api-sandbox.nowpayments.io/v1/invoice",
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
  url: `${process.env.NOWPAYMENTS_URL}/v1/payment/5603601336`, // Use the provided NPid
  headers: {
    "x-api-key": "SSJAK5K-6JA4YP6-NH76F0Q-DR80G9S", // Replace with your actual API key
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
      url: `https://api-sandbox.nowpayments.io/v1/payment/${NP_id}`,
      headers: {
        "x-api-key": "SSJAK5K-6JA4YP6-NH76F0Q-DR80G9S", // Use environment variable for API key
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
      url: `https://api-sandbox.nowpayments.io/v1/payment/${NP_id}`,
      headers: {
        "x-api-key": "SSJAK5K-6JA4YP6-NH76F0Q-DR80G9S", // Use environment variable for API key
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
        persentage: referralCode.persentage || 10, // Default 10% if not provided
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


// Schedule the task to run every day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  console.log("Updating main balance...");

  try {
    const users = await User.find();

    for (let user of users) {
      let total_profit = 0;

      // Loop through each package in the user's array
      for (let i = 0; i < user.packages.length; i++) {
        const pkg = user.packages[i]; // Get package by index
        const profit = (pkg.price * pkg.persentage) / 100;
        total_profit += profit; // Accumulate total profit
      }

      // Update user's balance with total profit
      user.balance += total_profit;

      user.total_profit += total_profit;
      
      await user.save();
    }

    console.log("Main balance updated successfully.");
  } catch (error) {
    console.error("Error updating balance:", error);
  }
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


// Server listening

module.exports = server;