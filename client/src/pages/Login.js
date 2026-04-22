import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const { login, loginMfa } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState('');

    const { email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');

        if (mfaRequired) {
            const res = await loginMfa(mfaToken);
            if (res.success) {
                navigate('/');
            } else {
                setError(res.msg);
            }
            return;
        }

        const res = await login(formData);
        if (res.success) {
            if (res.mfaRequired) {
                setMfaRequired(true);
            } else {
                navigate('/');
            }
        } else {
            setError(res.msg);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
                <h2 className="text-2xl font-bold text-center">Login</h2>
                {error && <div className="p-3 text-red-700 bg-red-100 rounded">{error}</div>}
                <form onSubmit={onSubmit} className="space-y-4">
                    {!mfaRequired ? (
                        <>
                            <div>
                                <label className="block mb-1 font-medium">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={onChange}
                                    required
                                    className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={onChange}
                                    required
                                    className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block mb-1 font-medium text-blue-700">MFA Code</label>
                            <p className="mb-2 text-sm text-gray-600">Enter the 6-digit code from your authenticator app.</p>
                            <input
                                type="text"
                                name="mfaToken"
                                value={mfaToken}
                                onChange={(e) => setMfaToken(e.target.value)}
                                placeholder="000000"
                                required
                                autoFocus
                                className="w-full px-4 py-2 text-center text-2xl tracking-widest border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none"
                    >
                        {mfaRequired ? 'Verify & Login' : 'Login'}
                    </button>
                    <p className="text-sm text-center">
                        Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
