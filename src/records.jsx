import { useCallback, useState } from "react";
import initialUsers from "./users.json";

export default function Records() {
    const [users, setUsers] = useState(initialUsers);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
    });

    const handleAddUser = useCallback(() => {
        setFormData({
            name: "",
            email: "",
            phone: "",
        });

        setShowModal(true);
    }, []);

    const handleChange = useCallback((event) => {
        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));
    }, []);

    const handleSubmit = useCallback(
        (event) => {
            event.preventDefault();

            if (
                !formData.name.trim() ||
                !formData.email.trim() ||
                !formData.phone.trim()
            ) {
                alert("Please enter all fields.");
                return;
            }

            const newUser = {
                id: Date.now(),
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
            };

            setUsers((previousUsers) => [...previousUsers, newUser]);

            setFormData({
                name: "",
                email: "",
                phone: "",
            });

            setShowModal(false);
        },
        [formData]
    );

    const handleCloseModal = useCallback(() => {
        setShowModal(false);

        setFormData({
            name: "",
            email: "",
            phone: "",
        });
    }, []);

    const handleDeleteUser = useCallback((id) => {
        setUsers((previousUsers) =>
            previousUsers.filter((user) => user.id !== id)
        );
    }, []);

    return (
        <div
            style={{
                padding: "32px",
                fontFamily: "Arial, sans-serif",
            }}
        >
            <h1>Users</h1>

            <button
                type="button"
                onClick={handleAddUser}
                style={{
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    cursor: "pointer",
                    marginBottom: "20px",
                }}
            >
                Add User
            </button>

            <ul
                style={{
                    listStyle: "none",
                    padding: 0,
                }}
            >
                {users.map((user) => (
                    <li
                        key={user.id}
                        style={{
                            padding: "14px",
                            marginBottom: "10px",
                            border: "1px solid #d0d7de",
                            borderRadius: "8px",
                        }}
                    >
                              
                <li
                    key={users.id}
                    style={{
                        marginBottom: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>{user.name}</span>

                    <button onClick={() => handleDeleteUser(user.id)}>
                        Delete
                    </button>
                </li>
                        <div>
                            <strong>Name:</strong> {user.name}
                        </div>

                        <div>
                            <strong>Email:</strong> {user.email || "Not available"}
                        </div>

                        <div>
                            <strong>Phone:</strong> {user.phone || "Not available"}
                        </div>
                    </li>
                ))}

            </ul>

            {showModal && (
                <div
                    onClick={handleCloseModal}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: "400px",
                            maxWidth: "90%",
                            padding: "24px",
                            backgroundColor: "white",
                            borderRadius: "10px",
                            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
                        }}
                    >
                        <h2 style={{ marginTop: 0 }}>Add User</h2>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label
                                    htmlFor="name"
                                    style={{
                                        display: "block",
                                        marginBottom: "6px",
                                    }}
                                >
                                    Name
                                </label>

                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label
                                    htmlFor="email"
                                    style={{
                                        display: "block",
                                        marginBottom: "6px",
                                    }}
                                >
                                    Email
                                </label>

                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label
                                    htmlFor="phone"
                                    style={{
                                        display: "block",
                                        marginBottom: "6px",
                                    }}
                                >
                                    Phone
                                </label>

                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "10px",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={{
                                        padding: "9px 15px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        backgroundColor: "white",
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    style={{
                                        padding: "9px 15px",
                                        border: "none",
                                        borderRadius: "6px",
                                        backgroundColor: "#16a34a",
                                        color: "white",
                                        cursor: "pointer",
                                    }}
                                >
                                    Save User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}