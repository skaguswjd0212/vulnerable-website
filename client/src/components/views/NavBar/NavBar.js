// client/src/components/views/NavBar/NavBar.js
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function NavBar() {
    const user = useSelector(state => state.user);
    const navigate = useNavigate();

    const handleLogout = () => {
        axios.get(`/api/users/logout`)
            .then(response => {
                if (response.data.success) {
                    navigate("/login");
                } else {
                    alert('로그아웃 하는데 실패 했습니다.');
                }
            });
    };

    // 간단한 내비게이션 바 스타일
    const navStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6'
    };

    const logoStyle = {
        fontWeight: 'bold',
        textDecoration: 'none',
        color: 'black'
    };
    
    const leftMenuStyle = {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
    };

    const menuStyle = {
        display: 'flex',
        gap: '1rem' // 메뉴 간격
    };

    const linkStyle = {
        textDecoration: 'none',
        color: '#495057'
    };

    return (
        <nav style={navStyle}>
            <div style={leftMenuStyle}>
                <a href="/" style={logoStyle}>My Shopping App</a>
                <a href="/orders" style={linkStyle}>마이페이지</a>
            </div>

            <div style={menuStyle}>
                {/* 로그인 안 한 상태 */}
                {(!user.userData || !user.userData.isAuth) && (
                    <>
                        <a href="/login">로그인</a>
                        <a href="/register">회원가입</a>
                    </>
                )}

                {/* 로그인 한 상태 */}
                {user.userData && user.userData.isAuth && (
                    <button onClick={handleLogout}>로그아웃</button>
                )}
            </div>
        </nav>
    );
}

export default NavBar;