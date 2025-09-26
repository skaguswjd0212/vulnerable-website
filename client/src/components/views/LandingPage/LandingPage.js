function LandingPage() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: 'calc(100vh - 60px)' // 전체 높이에서 NavBar 높이만큼 빼주기
        }}>
            <h2>🛍️환영합니다🛍️</h2>
        </div>
    )
}

export default LandingPage;