# Mr.G-AI-Browser-Extension-Chrome

## Build on GitHub

Open [Actions](https://github.com/RazvanManolache/Mr.G-AI-Browser-Extension-Chrome/actions/workflows/build.yml), choose **Run workflow**, and select the branch. Builds also run on pushes and pull requests. Open a successful run and download its **Artifacts** (GitHub sign-in required; retained for 30 days).

The download contains a validated extension ZIP and SHA-256 checksums. Extract the inner extension ZIP, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked** with the extracted directory. This packages the existing extension; it is not a Chrome Web Store release and still requires its Mr.G backend. Local packaging: install Python 3.10+ and Node.js, then run `python scripts/package.py` (or `npm run build` inside `extension`). No npm dependencies or webpack configuration are required.
