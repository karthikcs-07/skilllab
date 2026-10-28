const $ = (id) => document.getElementById(id);      // shortcut to get an element
const USERS_API = "https://randomuser.me/api/?results=10";      // GET: 10 new random users each time
const POST_API = "https://jsonplaceholder.typicode.com/users";  // POST: fake API that accepts new users
let users = [];                                      // data shown in the table

// ---------- API ----------
// Mock login API: waits 0.5s, then accepts or rejects
const loginApi = (u, p) => new Promise((ok, fail) => setTimeout(() =>
  u === "admin" && p === "Admin@123" ? ok({ token: "abc123", name: "Admin" })
                                     : fail(new Error("Wrong username or password")), 500));

// ---------- Validation ----------
// shows the message under the field if "bad" is true, returns true when the field is OK
const check = (errId, bad, msg) => { $(errId).textContent = bad ? msg : ""; return !bad; };

const validateLogin = () =>
  check("usernameError", $("username").value.trim().length < 3, "Username needs 3+ characters") &
  check("passwordError", $("password").value.length < 8 || !/\d/.test($("password").value), "Password needs 8+ characters and a number");

const validateUser = () =>
  check("nameError", $("newName").value.trim().length < 2, "Enter a name") &
  check("emailError", !/^\S+@\S+\.\S+$/.test($("newEmail").value), "Enter a valid email");

// ---------- Table + localStorage ----------
function render() {
  const q = $("search").value.toLowerCase();
  const list = users.filter((u) => u.name.toLowerCase().includes(q));
  $("tableBody").innerHTML = list.map((u) =>
    `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td>
     <td><button onclick="handleDelete(${u.id})">Delete</button></td></tr>`).join("");
  $("status").textContent = list.length + " users shown";
}

function save() {                                    // save to localStorage, then redraw
  localStorage.setItem("users", JSON.stringify(users));
  render();
}

async function loadUsers(force) {
  const saved = localStorage.getItem("users");
  try {
    if (saved && !force) users = JSON.parse(saved);  // use saved data
    else {                                           // GET from API
      $("status").textContent = "Loading from API...";
      const data = await (await fetch(USERS_API)).json();
      const fresh = data.results.map((u, i) => ({    // reshape API data into { id, name, email }
        id: i + 1,
        name: u.name.first + " " + u.name.last,
        email: u.email,
      }));
      users = [...fresh, ...users.filter((u) => u.id > 10)];  // keep users we added (ids above 10)
    }
    save();
    if (force) $("status").textContent += " (reloaded from API at " + new Date().toLocaleTimeString() + ")";
  } catch (e) { $("status").textContent = "Could not load users: " + e.message; }
}

// ---------- Pages ----------
function show(loggedIn) {
  $("loginPage").classList.toggle("hidden", loggedIn);
  $("dashboardPage").classList.toggle("hidden", !loggedIn);
  if (loggedIn) { $("welcome").textContent = "Welcome, " + localStorage.getItem("name"); loadUsers(false); }
}

// ---------- Button events ----------
$("loginBtn").addEventListener("click", async () => {
  $("loginError").textContent = "";
  if (!validateLogin()) return;                      // stop if invalid
  try {
    const res = await loginApi($("username").value.trim(), $("password").value);
    localStorage.setItem("token", res.token);        // stay logged in
    localStorage.setItem("name", res.name);
    $("remember").checked ? localStorage.setItem("rememberedUser", $("username").value.trim())
                          : localStorage.removeItem("rememberedUser");
    show(true);
  } catch (e) { $("loginError").textContent = e.message; }
});

$("logoutBtn").addEventListener("click", () => { localStorage.removeItem("token"); $("password").value = ""; show(false); });
$("reloadBtn").addEventListener("click", () => loadUsers(true));   // call the API again
$("search").addEventListener("input", render);                     // filter while typing

$("addBtn").addEventListener("click", async () => {
  if (!validateUser()) return;
  const user = { id: Date.now() % 100000, name: $("newName").value.trim(), email: $("newEmail").value.trim() };
  await fetch(POST_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(user) });  // POST
  users.push(user); save();
  $("newName").value = $("newEmail").value = "";
});

function handleDelete(id) {                          // called by each row's Delete button
  users = users.filter((u) => u.id !== id);          // randomuser.me has no DELETE, so remove locally
  save();
}

// ---------- Runs when the page opens ----------
$("username").value = localStorage.getItem("rememberedUser") || "";
$("remember").checked = !!localStorage.getItem("rememberedUser");
show(!!localStorage.getItem("token"));               // skip login if a token exists
