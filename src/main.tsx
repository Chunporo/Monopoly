import ReactDOM from "react-dom/client";
// @ts-ignore
import { BrowserRouter as Router, Route, Routes, RouterProvider, createBrowserRouter } from "react-router-dom";
import Gallery from "./Pages/Galery/gallery.tsx";
import Home from "./Pages/Home/home.tsx";
import Users from "./Pages/Users/users.tsx";
import { GameProvider } from "./services/GameContext.tsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <GameProvider defaultBackend="firebase">
                <Home />
            </GameProvider>
        ),
    },
    {
        path: "/gallery",
        element: <Gallery />,
    },
    {
        path: "/users",
        element: <Users />,
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

document.title = "Monopoly";
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
