module.exports = {
    purge: [],
    theme: {
        extend: {},
        fontFamily: {
            sans: ['Barlow']
        },
        inset: {
            '-16': '-4rem',
        },
        screens: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
        },
        spacing: {
            '1': '.25rem',
            '2': '.5rem',
            '3': '.75rem',
            '4': '1rem',
            '5': '1.25rem',
            '6': '1.5rem',
            '7': '2rem'
        },
        colors: {
            purple: {
                400: '#792bb6',
                700: '#811b88'
            },
            white: '#ffffff',
            black: '#000000',
            gray: {
                '100': '#f5f5f5',
                '200': '#eeeeee',
                '300': '#e0e0e0',
                '400': '#bdbdbd',
                '500': '#9e9e9e',
                '600': '#757575',
                '700': '#616161',
                '800': '#424242',
                '900': '#212121',
            }
        },
        height: {
            100: '50px',
            200: '100px',
            300: '150px',
            400: '200px',
            500: '250px',
            600: '300px',
            700: '350px',
            800: '400px',
            900: '450px',
            1000: '500px',

            '10-screen': '10vh',
            '20-screen': '20vh',
            '30-screen': '30vh',
            '40-screen': '40vh',
            '50-screen': '50vh',
            '60-screen': '60vh',
            '70-screen': '70vh',
            '80-screen': '80vh',
            '90-screen': '90vh',

            '4/4': '100%',
            '2/4': '50%',
            '3/4': '75%',
            '1/4': '25%',
        }
    },
    variants: {},
    plugins: [],
}
