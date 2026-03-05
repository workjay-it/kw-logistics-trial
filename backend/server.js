const express = require("express")
const cors = require("cors")
const pool = require("./db")

const app = express()

app.use(cors())
app.use(express.json())

// ROOT
app.get("/", (req, res) => {
  res.send("Logistics backend running")
})

/* ---------------- ORDERS ---------------- */

// GET all orders
app.get("/orders", async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT * FROM orders ORDER BY id ASC"
    )

    res.json(result.rows)

  } catch (err) {

    console.error(err)
    res.status(500).json({ error: "Database error" })

  }
})


// CREATE order
app.post("/orders", async (req, res) => {

  try {

    const {
      pickup,
      drop,
      pickup_lat,
      pickup_lng,
      drop_lat,
      drop_lng
    } = req.body

    const result = await pool.query(
      `INSERT INTO orders
      (pickup, dropoff, pickup_lat, pickup_lng, drop_lat, drop_lng, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        pickup,
        drop,
        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng,
        "pending"
      ]
    )

    res.json(result.rows[0])

  } catch (err) {

    console.error(err)
    res.status(500).json({ error: "Database error" })

  }

})

/* ---------------- DRIVERS ---------------- */

// GET all drivers
app.get("/drivers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM drivers ORDER BY id ASC")
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Database error" })
  }
})

// CREATE driver
app.post("/drivers", async (req, res) => {
  try {
    const { name, vehicle } = req.body

    const result = await pool.query(
      "INSERT INTO drivers (name, vehicle, status) VALUES ($1,$2,$3) RETURNING *",
      [name, vehicle, "available"]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Database error" })
  }
})

/* ---------------- ASSIGN DRIVER ---------------- */

app.post("/assign", async (req, res) => {
  try {
    const { orderId, driverId } = req.body

    const orderCheck = await pool.query(
      "SELECT * FROM orders WHERE id=$1",
      [orderId]
    )

    const driverCheck = await pool.query(
      "SELECT * FROM drivers WHERE id=$1",
      [driverId]
    )

    if (orderCheck.rows.length === 0 || driverCheck.rows.length === 0) {
      return res.status(404).json({ error: "Order or driver not found" })
    }

    await pool.query(
      "UPDATE orders SET driver_id=$1, status='assigned' WHERE id=$2",
      [driverId, orderId]
    )

    await pool.query(
      "UPDATE drivers SET status='busy' WHERE id=$1",
      [driverId]
    )

    const updatedOrder = await pool.query(
      "SELECT * FROM orders WHERE id=$1",
      [orderId]
    )

    res.json(updatedOrder.rows[0])

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Database error" })
  }
})

/* ---------------- COMPLETE ORDER ---------------- */

app.post("/complete", async (req, res) => {
  try {

    const { orderId } = req.body

    // Check if order exists
    const orderCheck = await pool.query(
      "SELECT * FROM orders WHERE id=$1",
      [orderId]
    )

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" })
    }

    const driverId = orderCheck.rows[0].driver_id

    // Mark order as delivered
    await pool.query(
      "UPDATE orders SET status='delivered' WHERE id=$1",
      [orderId]
    )

    // Make driver available again
    if (driverId) {
      await pool.query(
        "UPDATE drivers SET status='available' WHERE id=$1",
        [driverId]
      )
    }

    const updatedOrder = await pool.query(
      "SELECT * FROM orders WHERE id=$1",
      [orderId]
    )

    res.json(updatedOrder.rows[0])

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Database error" })
  }
})

/* ---------------- DRIVER LOCATIONS ---------------- */

// POST driver location update
app.post("/location", async (req,res)=>{
  try{

    const { driverId, lat, lng } = req.body

    await pool.query(
      "INSERT INTO driver_locations (driver_id,lat,lng) VALUES ($1,$2,$3)",
      [driverId,lat,lng]
    )

    res.json({message:"location saved"})

  }catch(err){
    console.error(err)
    res.status(500).json({error:"Database error"})
  }
})


// GET latest driver locations
app.get("/locations", async (req,res)=>{
  try{

    const result = await pool.query(`
      SELECT DISTINCT ON (driver_id)
      driver_id, lat, lng
      FROM driver_locations
      ORDER BY driver_id, created_at DESC
    `)

    res.json(result.rows)

  }catch(err){
    console.error(err)
    res.status(500).json({error:"Database error"})
  }
})

app.listen(5000, () => {
  console.log("Server running on port 5000")
})