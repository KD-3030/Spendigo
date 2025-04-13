// MongoDB admin insertion script
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

// MongoDB Connection
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
let db;

// Admin data
const admins = [
  { email: "SrinjayaSaha@spendigo.com", password: "PPs2@3%${4", name: "Admin One", role: "admin" },
  { email: "KinjalDutta@spendigo.com", password: "jG$}jM3)/v", name: "Admin Two", role: "admin" },
  { email: "AnilavoBiswas@spendigo.com", password: "lb{4XL>4;3", name: "Admin Three", role: "admin" },
  { email: "AbhijitKumarShaw@spendigo.com", password: "ZO4;mTET^p", name: "Admin Four", role: "admin" },
  { email: "UddalakMondal@spendigo.com", password: "T1iLV?~+x/", name: "Admin Five", role: "admin" }
];

// Function to hash passwords and insert admins
async function insertAdmins() {
  try {
    // Connect to MongoDB
    await client.connect();
    db = client.db('spendigo_db');

    // Hash passwords and insert admins
    const insertPromises = admins.map(async (admin) => {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      return db.collection('admins').insertOne({
        email: admin.email,
        password: hashedPassword,
        name: admin.name,
        role: admin.role
      });
    });

    // Wait for all insert operations to complete
    await Promise.all(insertPromises);
    console.log("All admins have been inserted successfully");
  } catch (err) {
    console.error("Error inserting admins:", err);
  } finally {
    // Close the database connection after all inserts are done
    await client.close();
  }
}

// Run the function to insert admin records
insertAdmins();
