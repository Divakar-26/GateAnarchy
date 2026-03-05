import Sidebar from './components/Sidebar/Sidebar.jsx'
import Workspace from './components/Workspace/Workspace.jsx'

function App() {

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <Workspace />
    </div>
  )
}

export default App
