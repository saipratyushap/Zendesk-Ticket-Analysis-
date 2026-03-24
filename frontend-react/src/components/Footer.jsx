import React from 'react';

const socials = [
    {
        id: 'linkedin',
        label: 'LinkedIn',
        path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
    },
    {
        id: 'twitter',
        label: 'X',
        path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    },
    {
        id: 'facebook',
        label: 'Facebook',
        path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    },
    {
        id: 'youtube',
        label: 'YouTube',
        path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505a3.017 3.017 0 0 0-2.122 2.136C0 8.055 0 12 0 12s0 3.945.501 5.814a3.017 3.017 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.945 24 12 24 12s0-3.945-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
    },
    {
        id: 'vimeo',
        label: 'Vimeo',
        path: "M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197a315.065 315.065 0 0 0 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.787 4.789.968 5.507.537 2.45 1.127 3.667 1.368 3.667.193 0 .484-.305.872-.916 1.955-2.506 2.876-4.513 2.76-6.023-.121-1.903-1.325-2.852-3.289-2.852a5.58 5.58 0 0 0-1.455.194c.966-3.174 2.812-4.718 5.535-4.632 2.018.059 2.972 1.37 2.86 3.923z"
    },
    {
        id: 'medium',
        label: 'Medium',
        viewBox: "0 0 24 24",
        path: "M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"
    },
    {
        id: 'rss',
        label: 'RSS',
        path: "M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.797 1.456-3.251 3.252-3.251 1.795.001 3.251 1.454 3.251 3.251zm-1.002-13.43c0-3.535-2.864-6.399-6.399-6.399l-.001 2.368c2.227 0 4.032 1.805 4.032 4.031l2.368-.001zm18.5 13.43c0-11.459-9.292-20.752-20.751-20.752v2.368c10.154 0 18.384 8.23 18.384 18.384h2.367zm-7.653 0c0-7.234-5.864-13.098-13.098-13.098v2.368c5.925 0 10.73 4.805 10.73 10.73h2.368z"
    },
];

const Footer = () => {
    return (
        <div className="footer-container">
            {/* UPPER FOOTER: CTA SECTION */}
            <div className="footer-cta">
                <div className="cta-content">
                    <h2>Ready to get started?</h2>
                    <p>Unlock the power of AI-driven insights with Demo Central.</p>
                    <button className="cta-button">Try it Now</button>
                </div>
            </div>

            {/* LOWER FOOTER: MAIN SECTION */}
            <footer className="footer">
                <div className="footer-content">
                    {/* LEFT: Logo + Copyright */}
                    <div className="footer-left">
                        <div className="footer-logo">
                            {/* ThirdEye Elephant SVG — white, compact */}
                            <svg
                                className="footer-elephant"
                                viewBox="0 0 80 72"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                {/* Body */}
                                <path
                                    d="M16 18C16 18 8 22 6 34C4 46 8 60 16 64L16 70H26L26 64C32 64 40 64 48 62C60 58 70 48 70 36C70 20 60 12 46 12L36 12L36 4L26 4L26 12C22 12 18 14 16 18Z"
                                    fill="white"
                                />
                                {/* Ear */}
                                <ellipse cx="50" cy="36" rx="10" ry="12" fill="rgba(255,255,255,0.25)" />
                                {/* Third Eye */}
                                <circle cx="18" cy="36" r="5" fill="#5a7e3a" />
                                <circle cx="18" cy="36" r="2.5" fill="white" />
                                {/* Monitor screen detail on back */}
                                <rect x="28" y="20" width="22" height="16" rx="3" fill="rgba(90,126,58,0.5)" />
                                <rect x="31" y="23" width="16" height="10" rx="1.5" fill="white" opacity="0.6" />
                            </svg>

                            <div className="footer-brand-text">
                                <span className="brand-third">THIRD</span>
                                <span className="brand-eye">EYE</span>
                            </div>
                        </div>
                        <p className="footer-copyright">
                            ©2026. ThirdEye Data. All Rights Reserved.
                        </p>
                    </div>

                    {/* RIGHT: Socials + Links */}
                    <div className="footer-right">
                        <div className="footer-socials">
                            {socials.map(social => (
                                <div key={social.id} className="social-icon" title={social.label}>
                                    <svg viewBox={social.viewBox || "0 0 24 24"} fill="white">
                                        <path d={social.path} fill="white" />
                                    </svg>
                                </div>
                            ))}
                        </div>
                        <div className="footer-links">
                            <a href="#">Privacy Policy</a>
                            <span className="separator">|</span>
                            <a href="#">Terms &amp; Conditions</a>
                            <span className="separator">|</span>
                            <a href="#">Cookies Policy</a>
                            <span className="separator">|</span>
                            <a href="#">System Status</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Footer;
