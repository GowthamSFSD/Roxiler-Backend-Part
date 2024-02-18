const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(cors());

const dbPath = path.join(__dirname, "roxiler.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log("connected to roxiler.db");

    //here i am create Table Name and insert value for calling this function
    // await createTable()
    // await insertValues();
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
  app.listen(3002, () => {
    console.log("Server Running at http://localhost:3002/");
  });
};

initializeDBAndServer();

const createTable = async () => {
  try {
    await db.exec(
      `CREATE TABLE IF NOT EXISTS transactions (
        id INT,
        title VARCHAR,
        price FLOAT,
        description TEXT,
        category TEXT,
        image TEXT,
        sold BOOLEAN,
        dateOfSale DATETIME
      );`
    );
    console.log("Table 'transactions' created successfully");
  } catch (error) {
    console.error(`Error creating table: ${error.message}`);
  }
};

const insertValues = async () => {
  console.log("hi");
  const url = "https://s3.amazonaws.com/roxiler.com/product_transaction.json";
  try {
    const response = await axios.get(url);
    const data = response.data;
    console.log(data);
    for (const product of data) {
      await db.run(
        `
                INSERT INTO transactions (id, title, price, description, category, image, sold, dateOfSale) VALUES
                (?, ?, ?, ?, ?, ?, ?, ?)
                `,
        [
          product.id,
          product.title,
          product.price,
          product.description,
          product.category,
          product.image,
          product.sold,
          product.dateOfSale,
        ]
      );
    }
    console.log("Added Successful");
  } catch (error) {
    console.error("Error:", error);
  }
};

//api-1
app.get("/transactions-details", cors(), async (req, res) => {
  let { month } = req.query;
  const getAllTransactionquery = `
    SELECT 
    id,
      title,
      description,
      Price,
      Category,
      Sold,
      Image,
      strftime('%d-%m-%Y', dateOfSale) AS dateOfSale
      FROM
        transactions
      WHERE
        strftime('%m', dateOfSale) = "${month}";
  `;

  const transactions = await db.all(getAllTransactionquery);
  res.send(transactions);
});

// api-2
app.get("/sales-details", cors(), async (req, res) => {
  let { month } = req.query;
  const getSalesDetailsQuery = `
  SELECT  
  SUM(price) AS totalAmountOfSale,
  SUM(CASE WHEN sold = 1 THEN 1 ELSE 0 END) AS totalSoldItems,
  SUM(CASE WHEN sold = 0 THEN 1 ELSE 0 END) AS totalUnsoldItems
  FROM 
  transactions 
  WHERE 
  strftime('%m', dateOfSale) = "${month}";`;
  const sales = await db.all(getSalesDetailsQuery);
  res.send(sales);
});

//api-3
app.get("/price-range", cors(), async (req, response) => {
  const { month } = req.query;
  const getPriceRangeQuery = `
  SELECT 
  title , price
  FROM
  transactions 
  WHERE 
     strftime("%m",dateOfSale) = "${month}";
  `;

  const priceRange = await db.all(getPriceRangeQuery);
  response.send(priceRange);
});

//api-4
app.get("/category-statistics", cors(), async (req, res) => {
  const { month } = req.query;
  const query = `
    SELECT category, COUNT(*) AS itemCount
    FROM transactions
    WHERE strftime('%m', dateOfSale) = '${month}'
    GROUP BY category;
  `;
  const data = await db.all(query);
  res.send(data);
});
