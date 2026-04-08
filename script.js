document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelectorAll(".site-nav a");
    const reveals = document.querySelectorAll(".reveal");
    const metricValues = document.querySelectorAll("[data-count]");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setRevealDelays() {
        reveals.forEach((item, index) => {
            item.style.setProperty("--reveal-delay", `${Math.min(index * 70, 420)}ms`);
        });
    }

    function initMenu() {
        if (!menuToggle) {
            return;
        }

        menuToggle.addEventListener("click", () => {
            const isOpen = body.classList.toggle("nav-open");
            menuToggle.setAttribute("aria-expanded", String(isOpen));
        });

        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                body.classList.remove("nav-open");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    function initRevealObserver() {
        if (prefersReducedMotion) {
            reveals.forEach((item) => item.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.18,
            rootMargin: "0px 0px -8% 0px"
        });

        reveals.forEach((item) => observer.observe(item));
    }

    function animateCount(element) {
        const target = Number(element.dataset.count);
        if (!target) {
            return;
        }

        const duration = prefersReducedMotion ? 1 : 1400;
        const start = performance.now();

        function frame(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = String(Math.round(target * eased));

            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }

        requestAnimationFrame(frame);
    }

    function initMetricObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                animateCount(entry.target);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.6 });

        metricValues.forEach((item) => observer.observe(item));
    }

    function updateWspDates() {
        const wspDates = document.getElementById("wsp-dates");
        if (!wspDates) {
            return;
        }

        const start = new Date(2025, 5, 1);
        const now = new Date();
        const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

        let duration = "";
        if (months < 1) {
            duration = "Less than 1 mo";
        } else if (months < 12) {
            duration = `${months} ${months === 1 ? "mo" : "mos"}`;
        } else {
            const years = Math.floor(months / 12);
            const remainder = months % 12;
            duration = `${years} ${years === 1 ? "yr" : "yrs"}`;
            if (remainder > 0) {
                duration += ` ${remainder} ${remainder === 1 ? "mo" : "mos"}`;
            }
        }

        wspDates.textContent = `Jun 2025 - Present · ${duration}`;
    }

    function initContactForm() {
        const form = document.getElementById("contact-form");
        const formStatus = document.getElementById("form-status");

        if (!form || !formStatus) {
            return;
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const submitButton = form.querySelector(".submit-btn");
            const originalText = submitButton ? submitButton.textContent : "";

            if (submitButton) {
                submitButton.textContent = "Sending...";
                submitButton.disabled = true;
            }

            formStatus.textContent = "";
            formStatus.className = "form-status";

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error("Failed to submit form");
                }

                form.reset();
                formStatus.textContent = "Thanks! Your message has been sent.";
                formStatus.classList.add("success");
            } catch (error) {
                console.error(error);
                formStatus.textContent = "Something went wrong while sending the form. Please try again.";
                formStatus.classList.add("error");
            } finally {
                if (submitButton) {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
            }
        });
    }

    function initModelViewer() {
        const container = document.getElementById("model-container");
        const loadingText = document.getElementById("loading-text");
        const status = document.getElementById("model-status");

        if (!container || !window.THREE || !THREE.OrbitControls || !THREE.GLTFLoader) {
            if (status) {
                status.textContent = "Status: Viewer scripts could not be initialized.";
            }
            return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x07111f);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
        camera.position.set(2.4, 1.5, 2.8);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 0.4;
        controls.maxDistance = 18;
        controls.target.set(0, 0, 0);

        scene.add(new THREE.HemisphereLight(0xbfdfff, 0x08111e, 1.15));

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(4, 5, 3);
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x7ce0ff, 0.55);
        rimLight.position.set(-4, 3, -3);
        scene.add(rimLight);

        const fillLight = new THREE.PointLight(0xff8f5c, 0.55, 20);
        fillLight.position.set(0, 2.5, 2);
        scene.add(fillLight);

        const gridHelper = new THREE.GridHelper(8, 8, 0x7ce0ff, 0x2a3f56);
        gridHelper.visible = false;
        scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(1.5);
        axesHelper.visible = false;
        scene.add(axesHelper);

        let modelRoot = null;
        let initialCamPos = camera.position.clone();
        let initialTarget = controls.target.clone();

        function resizeRenderer() {
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }

        function frameObject(object) {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            object.position.sub(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 ? 1.95 / maxDim : 1;
            object.scale.setScalar(scale);

            const framedBox = new THREE.Box3().setFromObject(object);
            const framedSize = framedBox.getSize(new THREE.Vector3());
            const distance = Math.max(framedSize.x, framedSize.y, framedSize.z) * 2.4;

            camera.position.set(distance, distance * 0.72, distance);
            controls.target.set(0, 0, 0);
            controls.update();

            initialCamPos = camera.position.clone();
            initialTarget = controls.target.clone();
        }

        const loader = new THREE.GLTFLoader();
        loader.load(
            "models/EGR%20248%20Midterm.gltf",
            (gltf) => {
                modelRoot = gltf.scene;
                scene.add(modelRoot);
                frameObject(modelRoot);

                if (loadingText) {
                    loadingText.remove();
                }

                if (status) {
                    status.textContent = "Status: Model loaded successfully.";
                }
            },
            (xhr) => {
                if (!loadingText || !status || !xhr.total) {
                    return;
                }

                const percentage = Math.round((xhr.loaded / xhr.total) * 100);
                loadingText.textContent = `Loading 3D model... ${percentage}%`;
                status.textContent = `Status: Loading ${percentage}%`;
            },
            (error) => {
                console.error(error);

                if (loadingText) {
                    loadingText.textContent = "Unable to load 3D model.";
                }

                if (status) {
                    status.textContent = "Status: Failed to load models/EGR 248 Midterm.gltf";
                }
            }
        );

        document.getElementById("reset-view")?.addEventListener("click", () => {
            camera.position.copy(initialCamPos);
            controls.target.copy(initialTarget);
            controls.update();
        });

        document.getElementById("toggle-grid")?.addEventListener("click", () => {
            gridHelper.visible = !gridHelper.visible;
        });

        document.getElementById("toggle-axes")?.addEventListener("click", () => {
            axesHelper.visible = !axesHelper.visible;
        });

        window.addEventListener("resize", resizeRenderer);
        resizeRenderer();

        function animate() {
            requestAnimationFrame(animate);

            if (modelRoot && !prefersReducedMotion) {
                modelRoot.rotation.y += 0.0025;
            }

            controls.update();
            renderer.render(scene, camera);
        }

        animate();
    }

    setRevealDelays();
    initMenu();
    initRevealObserver();
    initMetricObserver();
    updateWspDates();
    initContactForm();
    initModelViewer();
    window.setInterval(updateWspDates, 1000 * 60 * 60 * 6);
});
