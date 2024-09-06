import React from "react";
import "./header.css";
import closeButton from "../../assets/closeBtn.svg";
import logo from "../../assets/logo.jpg";
import bhasiniLogo from "../../assets/bhasini.png";

const Header = () => {
  return (
    <div className="header">
      <div className="leftCont">
        <div className="logoCont">
          <img src={logo} alt="" className="logo" />
        </div>

        <div className="titleCont">
          <p className="heading">Ask Nandi</p>
          <div className="subHeadingCont">
            <div className="subhcont">
              <p className="subheading">Powered by </p>
            </div>
            <a href="https://bhashini.gov.in/" target="_blank">
              <img
                className="bhasiniLogo"
                src={bhasiniLogo}
                alt="Bhasini Digital India"
              />
            </a>
          </div>
        </div>
      </div>

      <div className="closeBtnContainer">
        <img className="closeBtn" src={closeButton} alt="close" />
      </div>
    </div>
  );
};

export default Header;
