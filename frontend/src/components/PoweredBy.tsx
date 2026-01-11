import React from "react";

export const PoweredBy: React.FC = () => {
  return (
    <div className="powered-by-container">
      <div className="powered-by-badge">
        <span>Powered by</span>
        <img
          src="https://damassets.autodesk.net/content/dam/autodesk/www/autodesk-logo-primary.svg"
          alt="Autodesk"
        />
      </div>
      <div className="powered-by-badge">
        <span>Data verified by</span>
        <strong>Building Transparency</strong>
      </div>
      <div className="powered-by-badge">
        <span>EPD certified by</span>
        <strong>EPD International</strong>
      </div>
    </div>
  );
};

export default PoweredBy;
