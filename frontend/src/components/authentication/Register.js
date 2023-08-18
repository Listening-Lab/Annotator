import React, {useState, useContext} from "react"
import { UserContext } from "../../context/UserContext"
import styles from './register.module.css'
import { listening_lab_transparent } from "../../utils/icons"

const Register = () => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmationPassword, setConfirmationPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [, setToken] = useContext(UserContext)
    const [login, setLogin] = useState(true)
    const [reset, setReset] = useState(false)

    const submitRegistration = async () => {
        console.log("submitRegistration()")
        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ email: email, hashed_password: password })
        }
        const response = await fetch("http://localhost:8000/api/users", requestOptions)
        const data = await response.json()

        if (!response.ok) {
            setErrorMessage(data.detail)
        } else {
            setErrorMessage("Check email for verification link")
            setLogin(true)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (password.length < 5){
            setErrorMessage("Ensure passwords is greater than 5 characters")
        } else if (password !== confirmationPassword){
            setErrorMessage("Ensure passwords match")
        } else if (password === confirmationPassword){
            submitRegistration()
            
        } else {
            setErrorMessage("Something went wrong")
        }
    }

    const submitLogin = async () => {
        console.log("submitLogin()")
        const requestOptions = {
            method: "POST",
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: JSON.stringify(`grant_type=&username=${email}&password=${password}&scope=&client_id=&client_secret=`)
        }
        const response = await fetch("http://localhost:8000/api/token", requestOptions)
        const data = await response.json()
        console.log(data.detail)

        if (!response.ok) {
            setErrorMessage(data.detail)
        } else {
            setToken(data.access_token)
            localStorage.setItem("token", data.access_token)
        }
    }

    const handleLogin = (e) => {
        e.preventDefault()
        submitLogin()
    }

    function Reset() {
        const handleReset = async (e) => {
            e.preventDefault()
            const address = e.target[0].value
            setEmail(address)
            console.log('reset')
            const requestOptions = {
                method: "GET",
                headers: { 'Content-Type': 'application/json' }
            }
            const response = await fetch(`http://localhost:8000/password_reset/${address}`, requestOptions)
            if (response.ok) {
                setErrorMessage("Check email for password reset link")
                setReset(false)
                setLogin(true)
            }
        }

        return (
            <div className={styles.form}>
                <form className={styles.box} onSubmit={(e) => handleReset(e)}>
                    <h1>Reset</h1>
                    <label>Email Address</label>
                    <input className={styles.input} required type="email" placeholder="Enter email"/>

                    <div className={styles.submit}>
                        <button className={styles.submit_button} type="submit">RESET</button>
                    </div>
                    <h3>{errorMessage}</h3>
                    <button className={styles.none} onClick={() => setReset(false)}>Back to login</button>
                </form>
            </div>
        )
    }

    return (
        <div>
            <div className={styles.left}><img className={styles.logo} src={listening_lab_transparent}></img></div>

            <div className={styles.right}>
        { reset ? < Reset /> : <>

        { login ?
        <div className={styles.form}>
            <form className={styles.box} onSubmit={handleLogin}>
                <h1>Login</h1>
                <label>Email Address</label>
                <input className={styles.input} required type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value) }/>
                <label>Password</label>
                <input className={styles.input} required type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                <h3>{errorMessage}</h3>
                <div className={styles.submit}>
                    <button className={styles.submit_button} type="submit">Login</button>
                    <button className={styles.login} onClick={() => setLogin(false)}>Register</button>
                </div>
                <button className={styles.none} onClick={() => setReset(true)}>Forgot password</button>
            </form>
        </div> : 
        <div className={styles.form}>
            <form className={styles.box} onSubmit={handleSubmit}>
                <h1>Register</h1>
                <label>Email Address</label>
                    <input className={styles.input} required type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)}/>
                <label>Password</label>
                    <input className={styles.input} required type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                <label>Password Confirmation</label>
                    <input className={styles.input} required type="password" placeholder="Enter password again" value={confirmationPassword} onChange={(e) => setConfirmationPassword(e.target.value)}/>
                <h3>{errorMessage}</h3>
                <div className={styles.submit}>
                    <button className={styles.submit_button} type="submit">Register</button>
                    <button className={styles.login} onClick={() => setLogin(true)}>Login</button>
                </div>
            </form>
        </div>
        }

        </>
        }

        </div>
        </div>

    )
}

export default Register