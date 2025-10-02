import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { auth } from './_actions/user_action'; 
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';

import MyPage from './components/views/MyPage/MyPage';
import LandingPage from './components/views/LandingPage/LandingPage';
import LoginPage from './components/views/LoginPage/LoginPage';
import RegisterPage from './components/views/RegisterPage/RegisterPage';
import NavBar from './components/views/NavBar/NavBar';
import Auth from './hoc/auth';


function App() {
  const AuthLandingPage = Auth(LandingPage, null);
  const AuthLoginPage = Auth(LoginPage, null);
  const AuthRegisterPage = Auth(RegisterPage, false);
  const AuthMyPage = Auth(MyPage, true); // 로그인 필요
  const dispatch = useDispatch();

  // useEffect를 사용해 컴포넌트가 처음 마운트될 때 한 번만 실행
  useEffect(() => {
    dispatch(auth()).then(response => {
      console.log(response);
    });
  }, [dispatch]); 

  return (
    <>
      <NavBar />
      <div style={{ paddingTop: '60px' }}>
        <Routes>
          <Route path="/" element={<AuthLandingPage />} />
          <Route path="/login" element={<AuthLoginPage />} />
          <Route path="/register" element={<AuthRegisterPage />} />
          <Route path="/orders" element={<AuthMyPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;