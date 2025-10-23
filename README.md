<h1>A radial-menu driven screen capture interface with ChatGPT tool window.</h1>

<p>This app was a test using AI tools to co-develop an electron app to build a more intuitive interface with the basic ChatGPT tool window.</p>

<p>While it could in some cases be extended, this type of 'byproduct' interaction is not officially promoted or supported by the big AI companies who want to bundle access through metered APIs or 
  through other ecosystem apps.  It was designed as a proof of concept and a fun weekend project.</p>

<p>It functions similar to the Snipping Tool, capturing an area of your screen.  It then provides a radial menu to allow you to select a way to search about the contents of the picture.  
Because there is no API with the PWA/Windows-Store published desktop version of the application, it utilizes RPA.  The app lives in the system tray and gives options for settings.  Default is Ctrl-Shift-A to use.</p>

<p>App uses get-windows to determine active window state, robotjs for RPA, electron-store for settings management.</p>

<h2>Requirements</h2>
<ul><li>ChatGPT windows-store/PWA launched or run on system start (ChatGPT registers alt-enter key command to manipulate tool window while process is live).</li>
<li>ChatGPT Plus or better subscription to handle more image uploads.</li></ul>

<h2>How it works</h2>
<p>RPA process is as follows:</p>
<ul><li>Capture shortcut finds correct display and location, generates new transparent overlay window on current monitor</li>
    <li>User selects area of screen (with stunning animations) to ask question about</li>
    <li>When mouse-up occurs, app screen grabs and crops to area selected.</li>
    <li>Radial-menu pops around cursor location to allow user to select inquiry.</li>
    <li>RPA magic begins</li>
    <ul>
      <li>Emulate Alt-Enter to summon ChatGPT tool window</li>
      <li>Check if ChatGPT is current window (won't be if it was up but not in focus, so it is now gone)</li>
      <li>Resummon ChatGPT if it isn't in focus.</li>
      <li>Emulate enter to traverse to search bar.</li>
      <li>Paste image which starts upload/cache process</li>
      <li>Immediately paste corresponding prompt (changeable in settings) to frame question about image</li>
      <li>Emulate enter again to submit</li>
    </ul>
</ul>
  <p>The radial menu currently prompts for the following questions:</p>
  <ul><li>Solve the problem</li>
    <li>Generate Similar (create a copy)</li>
    <li>Explain the content</li>
    <li>Find resources (search) related to the content</li>
    <li>Shop around</li>
  </ul>
  
<h2>Why Would Anyone Do This?</h2>
<p>IMO, the app experience on desktop for these chatbots is trash tier.  I understand some of this is not caring, some is focusing on building revenue or data capture mechanisms through other means.  Some of this
is just that the PWAs/apps are temporary.</p>
<p>I don't always want to setup proper context for a repeatable but non-project-oriented questions.  I also don't want to type out long paragraphs just to get a basic answer
that better application concepts used to deliver through this new-fangled idea called a 'Graphical User Interface'.  Also I like retro gradient SFX and I enjoy that it is returning.  Radial menus are underutilized outside of
certain niche application spaces such as 3d modeling, and are useful for efficiency about a point in space.  Since most casual use on desktops involves manipulating the mouse around objects displayed visually on your monitor, it seems
self-evident to combine the two by leveraging the image analysis with slightly more directed control than MS/Copilot Recall and the concepts of preprogrammed interactions at the user level without manually
  entered text prompts.  Props to Xerox PARC, I still like the mouse.
</p>

<h2>How Would Anyone Do This?</h2>
<p>I thought I would Vibe Code this.  That didn't work past the first few steps and I had to carefully direct juvenile-but-well-read AIs to generate the components and build them out.  A smarter man would learn Electron (or better yet Tauri).
Instead I cat-hearded and ran QA for Google Gemini 2.5 and Claude Sonnet 4.5 (ironic) to produce this slightly verbose and inefficient prototype.  I still can't understand why it takes 37 prompts to get Nano Banana to generate
the world's most basic icon image files.  Props to the AI for making a terrible checkered background since it can't do actual transparency, though.</p>
