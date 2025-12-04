'use strict';

  // Global variables that are set and used
  // across the application
  let gl;

  // The programs
  let sphereGlobeProgram;

  // the textures
  let worldTexture;
  let myImageTexture;
  // VAOs for the objects
  var mySphere = null;
  var myCube = null;

  // what is currently showing
  let nowShowing = 'Sphere';

  // what texure are you using
  // valid values = "globe", "myimage" or "proc"
  let curTexture = "globe";

  var anglesReset = [30.0, 30.0, 0.0];
  var cube_angles = [30.0, 30.0, 0.0];
  var sphere_angles = [180.0, 180.0, 0.0];
  var angles = sphere_angles;
  var angleInc = 5.0;

let texturesLoaded = 0; 
const NUM_TEXTURES = 2; 

// This function is called once the image loads to load the data into the texture object
function doLoad(theTexture, theImage) {
    console.log("Loading texture:", theImage.src, "dimensions:", theImage.width, "x", theImage.height);
    
    gl.bindTexture(gl.TEXTURE_2D, theTexture);
    
    // *** CRITICAL FIX: Ensure the texture is flipped correctly immediately before uploading ***
    // This is the most common cause of textures failing to update from a placeholder.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    // 1. Load the actual image data (gl.RGB is correct for JPEGs)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, theImage);
    
    // 2. Set wrapping (Use CLAMP_TO_EDGE for large NPOT texture compatibility)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // 3. Generate mipmaps and set the final filter
    gl.generateMipmap(gl.TEXTURE_2D); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);
    
    // Check for WebGL errors
    var error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL error during texture load:", error);
    }
    
    // Increment the counter and only draw if all textures are loaded
    texturesLoaded++;
    console.log("Textures loaded:", texturesLoaded, "of", NUM_TEXTURES);
    if (texturesLoaded === NUM_TEXTURES) {
        draw();
    }
}

// Function to set up the texture objects and initiate loading
function setUpTextures(){

    // Existing globe texture
    worldTexture = gl.createTexture();
    
    // Set 1x1 placeholder (Red) to ensure the texture object is always valid
    gl.bindTexture(gl.TEXTURE_2D, worldTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0])); 
    gl.bindTexture(gl.TEXTURE_2D, null);

    const worldImage = new Image();
    worldImage.crossOrigin = 'anonymous'; // Critical fix for CORS
    worldImage.src = './1_earth_16k.jpg';
    worldImage.onerror = () => console.error("Failed to load world texture:", worldImage.src);
    worldImage.onload = () => { 
        console.log("World texture loaded successfully");
        doLoad(worldTexture, worldImage); 
    };

    // NEW IMAGE TEXTURE (meteor)
    myImageTexture = gl.createTexture();
    
    // Set 1x1 placeholder (Green) to ensure the texture object is always valid
    gl.bindTexture(gl.TEXTURE_2D, myImageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 0])); 
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Critical fix for CORS
    img.src = './eyeball.jpeg';
    img.onerror = () => console.error("Failed to load meteor texture:", img.src);
    img.onload = () => { 
        console.log("Meteor texture loaded successfully");
        doLoad(myImageTexture, img); 
    };
}


//
// Draws the current shape with the current texture
//
function drawCurrentShape () {
    
    // which shape are we drawing
    var object = mySphere;
    if (nowShowing == "Cube") object = myCube;
    
    // which program are we using
    var program = sphereGlobeProgram;
    
    // set up your uniform variables for drawing
    gl.useProgram(program);
    
    // Bind BOTH textures unconditionally before drawing.
    // This ensures both sampler uniforms point to valid texture units.
    
    // Bind worldTexture to TEXTURE0 (used by 'theTexture' sampler)
    gl.activeTexture(gl.TEXTURE0); 
    gl.bindTexture(gl.TEXTURE_2D, worldTexture);
    
    // Bind myImageTexture to TEXTURE1 (used by 'myImageTexture' sampler)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, myImageTexture);
    
    // Set texture mode based on keypress (curTexture = globe, myimage, proc)
    if (curTexture === "globe") {
        gl.uniform1i(program.uTextureMode, 1);
    }
    else if (curTexture === "myimage") {
        gl.uniform1i(program.uTextureMode, 2);
    }
    else {
        gl.uniform1i(program.uTextureMode, 3);
    }

    // set up rotation uniform
    gl.uniform3fv (program.uTheta, new Float32Array(angles));

    //Bind the VAO and draw
    gl.bindVertexArray(object.VAO);
    gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
    
}

// Create a program with the appropriate vertex and fragment shaders
function initProgram (vertexid, fragmentid) {
    
  // set up the per-vertex program
  const vertexShader = getShader(vertexid);
  const fragmentShader = getShader(fragmentid);

  // Create a program
  let program = gl.createProgram();
  
  // Attach the shaders to this program
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Could not initialize shaders');
    console.error(gl.getProgramInfoLog(program));
  }

  // Use this program instance
  gl.useProgram(program);
  
  // 1. Retrieve the location of all attributes and uniforms FIRST

  // Attributes
  program.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  program.aUV = gl.getAttribLocation(program, 'aUV');
    
  // Uniforms
  program.uTheTexture = gl.getUniformLocation (program, 'theTexture');
  program.uMyImageTexture = gl.getUniformLocation(program, 'myImageTexture');
  program.uTheta = gl.getUniformLocation (program, 'theta');
  program.uTextureMode = gl.getUniformLocation(program, 'textureMode');

  console.log("Uniform locations:", {
    theTexture: program.uTheTexture,
    myImageTexture: program.uMyImageTexture,
    theta: program.uTheta,
    textureMode: program.uTextureMode
  });

  
  // 2. Set the permanent texture unit bindings for the sampler uniforms
  // Sampler 'theTexture' (Unit 0), Sampler 'myImageTexture' (Unit 1)
  if (program.uTheTexture) {
      gl.uniform1i(program.uTheTexture, 0); 
  }
  if (program.uMyImageTexture) {
      gl.uniform1i(program.uMyImageTexture, 1); 
  }

  return program;
}

///////////////////////////////////////////////////////////////////
//
//  No need to edit below this line.
//
////////////////////////////////////////////////////////////////////

// general call to make and bind a new object based on current
// settings..Basically a call to shape specfic calls in cgIshape.js
function createShapes() {
    
    // the sphere
    mySphere = new Sphere (20,20);
    mySphere.VAO = bindVAO (mySphere, sphereGlobeProgram);
    
    // the cube
    myCube = new Cube (20);
    myCube.VAO = bindVAO (myCube, sphereGlobeProgram);
    
}



  // Given an id, extract the content's of a shader script
  // from the DOM and return the compiled shader
  function getShader(id) {
    const script = document.getElementById(id);
    const shaderString = script.text.trim();

    // Assign shader depending on the type of shader
    let shader;
    if (script.type === 'x-shader/x-vertex') {
      shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else if (script.type === 'x-shader/x-fragment') {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else {
      return null;
    }

    // Compile the shader using the supplied shader code
    gl.shaderSource(shader, shaderString);
    gl.compileShader(shader);

    // Ensure the shader is valid
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Compiling shader " + id + " " + gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

//
// Creates a VAO for a given object and return it.
//
// shape is the object to be bound
// program is the program (vertex/fragment shaders) to use in this VAO
//
//
// Note that the program object has member variables that store the
// location of attributes and uniforms in the shaders.  See the function
// initProgram for details.
//
// You can see the definition of the shaders themselves in the
// HTML file assn6-shading.html.   Though there are 2 sets of shaders
// defined (one for per-vertex shading and one for per-fragment shading,
// each set does have the same list of attributes and uniforms that
// need to be set
//
function bindVAO (shape, program) {
    
    //create and bind VAO
    let theVAO = gl.createVertexArray();
    gl.bindVertexArray(theVAO);
    
    // create, bind, and fill buffer for vertex locations
    // vertex locations can be obtained from the points member of the
    // shape object.  3 floating point values (x,y,z) per vertex are
    // stored in this array.
    let myVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, myVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.points), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.aVertexPosition);
    gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    
    // create, bind, and fill buffer for uv's
    // uvs can be obtained from the uv member of the
    // shape object.  2 floating point values (u,v) per vertex are
    // stored in this array.
    let uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.uv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.aUV);
    gl.vertexAttribPointer(program.aUV, 2, gl.FLOAT, false, 0, 0);
    
    // Setting up element array
    // element indicies can be obtained from the indicies member of the
    // shape object.  3 values per triangle are stored in this
    // array.
    let myIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, myIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(shape.indices), gl.STATIC_DRAW);

    // Do cleanup
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    return theVAO;
}



  
  // We call draw to render to our canvas
  function draw() {
    // Clear the scene
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
 
    // draw your shapes
    drawCurrentShape ();

    // Clean
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  // Entry point to our application
  function init() {
      
    // Retrieve the canvas
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) {
      console.error(`There is no canvas with id ${'webgl-canvas'} on this page.`);
      return null;
    }

    // deal with keypress
    window.addEventListener('keydown', gotKey ,false);

    // Retrieve a WebGL context
    gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error(`There is no WebGL 2.0 context`);
        return null;
      }
      
    // Set the clear color to be black
    gl.clearColor(0, 0, 0, 1);
      
    // some GL initialization
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.clearColor(0.0,0.0,0.0,1.0)
    gl.depthFunc(gl.LEQUAL)
    gl.clearDepth(1.0)
    
    // NOTE: gl.pixelStorei (gl.UNPACK_FLIP_Y_WEBGL, true) moved to doLoad()
    // where it is most effective right before the image upload.
      
    // deal with keypress
    window.addEventListener('keydown', gotKey ,false);

    // Read, compile, and link your shaders
    sphereGlobeProgram = initProgram('sphereMap-V', 'sphereMap-F');
    
    // create and bind your current object
    createShapes();
    
    // set up your textures
    setUpTextures();
    
    // We call draw here, but if textures aren't loaded, only the placeholder is used
    draw();
  }
