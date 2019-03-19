import React, { Component  } from 'react';
import './App.css';

import { LineChart, ReferenceLine, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';



  class CustomizedLabel extends React.Component {
    render () {
      const {x, y, stroke, value} = this.props;
      
      return <text x={x} y={y} dy={-4} fill={stroke} fontSize={10} textAnchor="middle">{value}</text>
    }
  };


  class CustomizedAxisTick extends React.Component {
    render () {
      const {x, y, stroke, payload} = this.props;
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" transform="rotate(0)">{new Date(payload.value).getHours()}:00</text>
        </g>
      );
    }
  };


  class TemperatureChart extends React.Component {
    render () {
      return (
        <LineChart width={1300} height={500} data={this.props.chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Line type="monotone" dataKey="inside temp" dot={false} stroke="#8884d8" />
          <Line type="monotone" dataKey="outside temp" dot={false} stroke="#888400" />
          <Line type="monotone" dataKey="water line temp" dot={false} stroke="#880000" />
          <Line type="monotone" dataKey="water tank temp" dot={false} stroke="#888499" />
          <Legend />
          
          {this.props.pumpData.map(obj => 
            <ReferenceLine key={obj.event_id} x={obj.millisTime} stroke="green"/>      
          )} 
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <XAxis type="number" dataKey="millisTime" tickCount={8} tick={<CustomizedAxisTick/>} 
              domain={['dataMin', 'dataMax']} />
          <YAxis />
          <Tooltip />
        </LineChart> 
      );
    }
  };



class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pumpEvents: [],
      tempEvents: [],
      tempData: [],
      pumpData: [],
      month: 3,
      day: 2,
      showPumpEvents: false,
    };


  }


  crunchData(){
    console.log('crunching data...')
    try{
      let data = this.state.tempEvents.filter(evt => {
        let dt = new Date(evt.created_on);
        //dt.setHours(dt.getHours() - 8);
        if(dt.getDate()===parseInt(this.state.day) && dt.getMonth()===parseInt(this.state.month)-1){return true;}
        return false;
      })

      data = data.map(function(evt){
        evt.millisTime = new Date(evt.created_on).getTime(); //-8*60*60*1000; 
        evt[evt.name] = evt.num_val;        
        return evt;
      }).sort((a,b) => a.millisTime - b.millisTime );


      let newData = [data[0]];
      data.forEach(evt => {
        if(Math.abs(newData[newData.length-1].millisTime - evt.millisTime) < 10000){
          newData[newData.length-1][evt.name] = evt[evt.name];
        }else{
          newData.push(evt);
        }
      });
      this.setState({tempData:newData})

      if(this.state.showPumpEvents){
        data = this.state.pumpEvents.filter(evt => {
          let dt = new Date(evt.created_on);
          //dt.setHours(dt.getHours() - 8);
          if(dt.getDate()===parseInt(this.state.day) && dt.getMonth()===parseInt(this.state.month)-1){return true;}
          return false;
        }).map(function(evt){
          evt.millisTime = new Date(evt.created_on).getTime(); //-8*60*60*1000;       
          return evt;
        }).sort((a,b) => a.millisTime - b.millisTime );
      }else{
        data = [];
      }
      this.setState({pumpData:data})
    }catch{
      console.log('this broke')
    }

  }

  componentDidMount() {
    let url = '';
    //url = 'http://localhost:5000'

    fetch(url+'/api/pumpevents')
      .then(response => {
        if (!response.ok) {throw new Error(`status ${response.status}`);}
        return response.json();
      })
      .then(json => {
        this.setState({pumpEvents:json})
        this.crunchData();
      }).catch(e => {
        this.setState({message: `API call failed: ${e}`});
      })

    //Now get all the temperature measurements
    fetch(url+'/api/temps')
      .then(response => {
        if (!response.ok) {throw new Error(`status ${response.status}`);}
        return response.json();
      }).then(json => {
        console.log('we got here, ')
        this.setState({tempEvents:json})
        this.crunchData();
      }).catch(e => {
        this.setState({message: `API call failed: ${e}`});
      })

 


  }

  
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Van Tracker</h1>
        </header>

        
        <h5>Van Temperature Chart</h5>
        <label>
          Month:
          <input type="text" value={this.state.month} 
            onChange={i => {this.setState({month: i.target.value},this.crunchData)}} />
        </label>
        <label>
          Day:
          <input type="text" value={this.state.day} 
            onChange={i => {this.setState({day: i.target.value},this.crunchData)}} />
        </label>
        <label>
          Show pump events:
          <input
            type="checkbox"
            checked={this.state.showPumpEvents}
            onChange={i => {this.setState({showPumpEvents: i.target.checked},this.crunchData)}} />
        </label>

        <TemperatureChart chartData={this.state.tempData} pumpData={this.state.pumpData} />



      </div>
    );
  }
}

export default App;
