export default function Toast({ visible, message }) {
  return (
    <div id="toast" className={`toast${visible ? ' active' : ''}`}>
      {message}
    </div>
  )
}
