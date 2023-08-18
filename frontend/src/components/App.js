import Register from "./authentication/Register"
import Waveform from "./Waveform"
import { UserContext } from "../context/UserContext"

import React, {useContext} from 'react'

import './app.css'


export default function App() {
  const [token] = useContext(UserContext)
  
  return (
      <div>
        { token !== null ? < Waveform /> : <Register/> } 
      </div>
  )
}