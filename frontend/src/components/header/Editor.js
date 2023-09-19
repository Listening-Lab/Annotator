import React, { useContext } from 'react'
import { UserContext } from "../../context/UserContext"
import styles from './editor.module.css'
import { trash_icon } from '../../utils/icons'

export default function Region({classes, setClasses, setColours}) {
    const [token,] = useContext(UserContext)

    const getClasses = async () => {
      const requestOptions = {
        method: "GET",
        headers: {'Content-Type': 'application/json', Authorization: "Bearer " + token},
      }

      const response = await fetch('http://localhost:8000/api/settings/labels', requestOptions)
      if (response.ok) {
        const data = await response.json()
        setClasses([])
        setColours(data)
        for (const item of Object.keys(data)) {
          setClasses(classes => [...classes, {label: item,
                                              colour: data[item]}])
        }
      } else {
        console.log("something went wrong")
      }
    }

    const handleNewClass = async (e) => {
      e.preventDefault()
      const requestOptions = {
        method: "POST",
        headers: {'Content-Type': 'application/json', Authorization: "Bearer " + token},
        body: JSON.stringify({"labels": e.target[0].value,
                              "colours": "#0000ff"})
      }
      
      const response = await fetch('http://localhost:8000/api/settings/labels/', requestOptions)
      if (response.ok) {
        console.log("create classes")
        getClasses()
      }
    }

    const updateClass = async (e) => {
      e.preventDefault()
      const requestOptions = {
        method: "PUT",
        headers: {'Content-Type': 'application/json', Authorization: "Bearer " + token},
        body: JSON.stringify({"colours": e.target.value,
                              "labels": e.currentTarget.parentElement.getAttribute("value")})
      }
      const response = await fetch(`http://localhost:8000/api/settings/labels/`, requestOptions)
      if (response.ok) {
        console.log("colour changed")
      }
      getClasses()
    }

    const deleteClass = async (option) => {
      const requestOptions = {
        method: "DELETE",
        headers: {'accept': 'application/json', Authorization: "Bearer " + token}
      }
      
      const response = await fetch(`http://localhost:8000/api/settings/labels/${option.label}`, requestOptions)
      if (response.ok) {
        getClasses()
      }
    }

  return (
  <div className="tour-editor">
    <div className={styles.labelEditor}>
        <div className={styles.classes}>
          <form onSubmit={(e) => handleNewClass(e)}>
            <div className={styles.inputs}>
              <input type='text' placeholder='New label' required/>
              <button type='submit'>+</button>
            </div>
          </form>
          <hr></hr>
        {classes.map((opt,index) => <div className={styles.class} key={index} value={opt.label}>
            <input type="color" value={opt.colour.slice(0,7)} onChange={(e) => updateClass(e)} draggable={false} ></input> 
            <p className={styles.text}>
              <label>{opt.label}</label>
            </p>
            {opt.label !== 'unknown' ?
              <button className={styles.button} onClick={() => deleteClass(opt)}><img src={trash_icon} alt='delete'/></button> :
            null}
          </div>)}
        </div>
    </div>
  </div>
  ) 
}