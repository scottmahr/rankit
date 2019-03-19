const express = require('express');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
var bodyParser = require('body-parser');
const asyncHandler = require('express-async-handler')
const { Client, Pool } = require('pg');




const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5000;



// Multi-process to utilize all CPU cores.
if (!isDev && cluster.isMaster) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`);
  });

} else {
  const app = express();

  // app.use(function(req, res, next) {
  //   res.header("Access-Control-Allow-Origin", "*");
  //   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //   next();
  // });


  var dbClient;

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json())

  if(process.env.DATABASE_URL){
    dbClient = new Client({
          connectionString: process.env.DATABASE_URL,
          ssl: true,
        });
  }else{
    // dbClient = new Client({
    //       connectionString:'postgres://localhost:5432',
    //       ssl: false,
    //     });

    dbClient = new Client({
        user: 'spcbxofrfcwzbw',
        host: 'ec2-54-243-128-95.compute-1.amazonaws.com',
        database: 'd9rid4ji4gderf',
        password: '0d60e107f10b8f21e23b28a1607fcad3220f0304b967eede8725902fd9577a99',
        port: 5432,
        ssl: true,
    });
  }
  dbClient.connect();


  async function query (q) {
    let res
    try {
      await dbClient.query('BEGIN')
      try {
        res = await dbClient.query(q)
        await dbClient.query('COMMIT')
      } catch (err) {
        await dbClient.query('ROLLBACK')
        throw err
      }
    } finally {
    }
    return res
  }


  // Priority serve any static files.
  app.use(express.static(path.resolve(__dirname, '../react-ui/build')));

  // Answer API requests.

  app.get("/api/vans", asyncHandler(async(req, res) => {
    //This should get all of the vans and send them down
    try {
      const { rows } = await query('SELECT * FROM vans')
      res.json(rows);
    } catch (err) {
      console.log('Database ' + err)
    }
  }));
  
  app.get("/api/objects", asyncHandler(async(req, res) => {
    //This should get all of the objects and send them down
    try {
      const { rows } = await query('SELECT * FROM objects')
      res.json(rows);
    } catch (err) {
      console.log('Database ' + err)
    }
  }));

  app.get("/api/events", asyncHandler(async(req, res) => {
    //This should get all of the events and send them down
    try {
      const { rows } = await query('SELECT * FROM events')
      res.json(rows);
    } catch (err) {
      console.log('Database ' + err)
    }
  }));


  app.get("/api/temps", asyncHandler(async(req, res) => {
    //This should get all of the events and send them down
    try {
      const { rows } = await query("SELECT   events.event_id,   objects.object_id,   events.num_val,   events.created_on,   objects.name,   objects.hw_id FROM events INNER JOIN objects ON events.object_id = objects.object_id WHERE objects.subtype = 'temp';")
      res.json(rows);
    } catch (err) {
      console.log('Database ' + err)
    }
  }));

  app.get("/api/pumpevents", asyncHandler(async(req, res) => {
    //This should get all of the events and send them down
    try {
      const { rows } = await query("SELECT * FROM events WHERE object_id = 6;")
      res.json(rows);
    } catch (err) {
      console.log('Database ' + err)
    }
  }));



  app.post("/api/events", asyncHandler(async(req, res) => {
    //How to add a new sensor
    console.log(`Events: ${JSON.stringify(req.body)}`);
    //First, let's see if we have a sensor ID, if not, find one
    req.body.hw_id = req.body.event_name.split('_')[2];

    try {
      if(!req.body.object_id){
        if(req.body.hw_id){
          const { rows } = await query(`select * from objects where hw_id = '${req.body.hw_id}'`)
          if(rows.length==1){
            req.body.object_id = rows[0].object_id;
          }else{throw "No object for that hw_id";}
        }else{
          res.json({'error':'We need a object_id or hw_id'})
        }
      }
    
      let valType = 'num_val';
      let val = parseFloat(req.body.data);
      
      var data = await query(`INSERT INTO events (object_id,${valType}) VALUES (${req.body.object_id},${val});`)
    } catch (err) {
      console.log('Event Database ' + err)
      res.json({'error':'Database ' + err})
    }
    res.json(data); 
  }));

    


  app.post("/api/pump_event", asyncHandler(async(req, res) => {
    console.log(`pump event: ${JSON.stringify(req.body)}`);
    let val = req.body.data;
    try {   
      console.log(`INSERT INTO events (object_id,str_val) VALUES (6,"${val}");`)
      var data = await query(`INSERT INTO events (object_id,str_val) VALUES (6,'${val}');`)
    } catch (err) {
      console.log('Pump Database ' + err)
      res.json({'error':'Database ' + err})
    }
    res.json(data); 
  }));

  // All remaining requests return the React app, so it can handle routing.
  app.get('*', function(request, response) {
    response.sendFile(path.resolve(__dirname, '../react-ui/build', 'index.html'));
  });

    

  app.listen(PORT, function () {
    console.error(`Node ${isDev ? 'dev server' : 'cluster worker '+process.pid}: listening on port ${PORT}`);
  });
}



//DB Layout
//Object types: sensor, switch, relay



// drop schema public cascade; 
// create schema public;
// CREATE TABLE vans(
//  van_id serial PRIMARY KEY,
//  name  VARCHAR(50) NOT NULL UNIQUE,
//  created_on TIMESTAMP NOT NULL DEFAULT NOW());

// CREATE TABLE objects(
//  object_id serial PRIMARY KEY,
//  name  VARCHAR(50) NOT NULL UNIQUE,
//  description  VARCHAR(100),
//  hw_id VARCHAR(50),
//  particle_id VARCHAR(30),
//  type  VARCHAR(50),    
//  subtype  VARCHAR(50),    
//  van_id INTEGER NOT NULL REFERENCES vans(van_id),
//  created_on TIMESTAMP NOT NULL DEFAULT NOW());

// CREATE TABLE events(
//  event_id serial PRIMARY KEY,
//  object_id INTEGER NOT NULL REFERENCES objects(object_id),
//  num_val REAL,
//  str_val VARCHAR(256),
//  bool_val BOOL,
//  event_time INTEGER,
//  created_on TIMESTAMP NOT NULL DEFAULT NOW());

// INSERT INTO vans (name) VALUES ('van v2');
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('water tank temp','28E8B379970603B6','111','sensor','temp',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('water line temp','28D9A17997060393','111','sensor','temp',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('outside temp','280D9879970603FC','111','sensor','temp',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('inside temp','280BC779970603B4','111','sensor','temp',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('induction cooktop','D3','111','relay','120V',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('water heater','D4','111','relay','120V',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('hot water valve','D5','111','relay','12V',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('water pump','D6','111','relay','12V',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('water heater switch','D7','111','switch','toggle',1);
// INSERT INTO objects (name,hw_id,particle_id,type,subtype,van_id) VALUES ('cooktop switch','D8','111','switch','toggle',1);
// 

//INSERT INTO events (object_id,num_val) VALUES (4, 56);


// UPDATE objects SET name = 'water line temp' WHERE object_id = 1;
// UPDATE objects SET name = 'outside temp' WHERE object_id = 2;
//UPDATE objects SET name = 'inside temp' WHERE object_id = 3;
// UPDATE objects SET name = 'water tank temp' WHERE object_id = 11;

// SELECT 
//   events.event_id,
//   objects.object_id,
//   events.num_val,
//   events.created_on,
//   objects.name,
//   objects.hw_id
// FROM events
// INNER JOIN objects ON events.object_id = objects.object_id
// WHERE objects.subtype = 'temp';




//SELECT table_name FROM information_schema.tables WHERE table_schema='public'; 

//SELECT * FROM objects INNER JOIN vans ON (objects.van_id = vans.van_id);

/*
Things to do:
- Set up particle to send data to the web
  - Temperature readings
  - Events every time a switch is switched
  - Events every time a realy is triggered
  - Current readings
- Show the latest event for each object on the web
- Be able to turn things on and off from the web. 
- Have particle turn on the heater pump when the water temp gets too cold
- Show plots for event data over time
- Combine events to save data







https://api.particle.io/v1/devices/0123456789abcdef01234567/brew \
     -d access_token=9876987698769876987698769876987698769876
*/




