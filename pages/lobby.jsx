import Button from '../components/button'


function Lobby() {
    return (
        <div className="h-screen w-screen flex flex-col bg-gray-900">
            <div className="rounded-lg m-10 h-20 bg-gray-800 flex flex-row items-center justify-center content-center px-4">
                <Button text={"hello"}></Button>
            </div>
            <div>

            </div>
        </div>
    )
}

export default Lobby