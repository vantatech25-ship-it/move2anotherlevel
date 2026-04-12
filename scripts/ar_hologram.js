// Three.js Holographic Background/AR Simulation
let scene, camera, renderer, particles, orb;

function initHologram() {
      const container = document.getElementById('hologram-wrapper');
      if (!container) return;

    scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

    // Create a rotating hologram grid (the "AR floor")
    const gridHelper = new THREE.GridHelper(20, 40, 0x00f2ff, 0x111111);
      gridHelper.position.y = -2;
      gridHelper.rotation.x = Math.PI / 8;
      scene.add(gridHelper);

    // Add a central "Core" orb representing focus/activity
    const geometry = new THREE.IcosahedronGeometry(2, 2);
      const material = new THREE.MeshBasicMaterial({
                color: 0x00f2ff,
                wireframe: true,
                transparent: true,
                opacity: 0.15
      });
      orb = new THREE.Mesh(geometry, material);
      scene.add(orb);

    // Add floating particles
    const partGeo = new THREE.BufferGeometry();
      const partCount = 500;
      const posArray = new Float32Array(partCount * 3);

    for(let i=0; i < partCount * 3; i++) {
              posArray[i] = (Math.random() - 0.5) * 10;
    }

    partGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const partMat = new THREE.PointsMaterial({
                size: 0.005,
                color: 0xbc00ff
      });

    particles = new THREE.Points(partGeo, partMat);
      scene.add(particles);

    animate();
}

function animate() {
      requestAnimationFrame(animate);

    // Rotate elements
    orb.rotation.y += 0.005;
      orb.rotation.x += 0.002;

    particles.rotation.y += 0.001;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
      if(!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
});

initHologram();
