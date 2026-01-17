import '../App.css' 

function Button({text, onClick}) {
    return (
        <button 
        type="button" 
        className="text-white bg-linear-to-br from-purple-600 to-blue-500 hover:bg-linear-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-base text-sm px-4 py-2.5 text-center leading-5"
        onClick={onClick}
        >
            {text}
        </button>  
    )
}

export default Button