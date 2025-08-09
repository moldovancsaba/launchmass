import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <div className="info-bar">
        <img
          src="https://i.ibb.co/nsmDf93m/seyu-logo.png"
          alt="SEYU Logo"
          width="48"
          height="48"
        />
        <span className="info-text">SEYU SELFIES</span>
      </div>
    </>
  );
}
