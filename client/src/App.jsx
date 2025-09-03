import './App.css'
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Chat from './pages/Chat'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Register from './pages/Register'

function App() {

  return (
    <>
    <BrowserRouter>   
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
