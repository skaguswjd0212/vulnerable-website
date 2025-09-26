import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/views/LandingPage/LandingPage';
import LoginPage from './components/views/LoginPage/LoginPage';
import RegisterPage from './components/views/RegisterPage/RegisterPage';
import NavBar from './components/views/NavBar/NavBar';
import Auth from './hoc/auth';

function App() {
  const AuthLandingPage = Auth(LandingPage, null);
  const AuthLoginPage = Auth(LoginPage, null);
  const AuthRegisterPage = Auth(RegisterPage, false);

  return (
    // <Router>를 제거했습니다.
    <>
      {/* NavBar는 Routes 밖에 두어 항상 보이게 합니다. */}
      <NavBar />
      <div style={{ paddingTop: '60px' }}>
        {/* Routes 안에서 경로 규칙을 정의합니다. */}
        <Routes>
          {/*
            - path="/" : 웹사이트의 가장 기본 주소(홈)
            - element={...} : 해당 주소에서 보여줄 컴포넌트
          */}
          <Route path="/" element={<AuthLandingPage />} />
          <Route path="/login" element={<AuthLoginPage />} />
          <Route path="/register" element={<AuthRegisterPage />} />
        </Routes>
      </div>
    </> // <Router>를 제거했으므로 최상위 태그로 Fragment(<>)를 사용하거나 그냥 div를 사용해도 됩니다.
  );
}

export default App;