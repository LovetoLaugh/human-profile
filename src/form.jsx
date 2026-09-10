
import React, { useCallback, useState } from "react";

export default function Form({ onSubmit }) {
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
   

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;

        if (name === "Username") {
            setUserName(value);
        }

        if (name === "Password") {
            setPassword(value);
        }
    }, []);

    const handleClear = useCallback(() => {
        setUserName("");
        setPassword("");
    }, []);

    const handleSubmit = useCallback(() => {
        const payload = {
            Username: userName,
            Password: password,
        };

        console.log(payload);
        if (typeof onSubmit === "function") {
            onSubmit(payload);
        }
        setUserName("");
        setPassword("");
    }, [onSubmit, password, userName]);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f5f7fb",
            }}
        >
            <div
                style={{
                    width: "320px",
                    padding: "24px",
                    border: "1px solid #d0d7de",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                    backgroundColor: "#ffffff",
                }}
            >
                <div style={{ marginBottom: "20px" }}>
                    <label htmlFor="username" style={{ display: "block", marginBottom: "8px" }}>
                        Username:
                    </label>
                    <input
                        id="username"
                        name="Username"
                        onChange={handleChange}
                        value={userName}
                        style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            boxSizing: "border-box",
                        }}
                    />
                </div>
                <div style={{ marginBottom: "24px" }}>
                    <label htmlFor="password" style={{ display: "block", marginBottom: "8px" }}>
                        Password:
                    </label>
                    <input
                        id="password"
                        type="password"
                        name="Password"
                        onChange={handleChange}
                        value={password}
                        style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            boxSizing: "border-box",
                        }}
                    />
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "16px",
                    }}
                >
                    <button
                        onClick={handleSubmit}
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            cursor: "pointer",
                        }}
                    >
                        Submit
                    </button>
                    <button
                        onClick={handleClear}
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            backgroundColor: "#ffffff",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}

