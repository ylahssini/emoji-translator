var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'gh-pages',
        repo: 'https://github.com/ylahssini/emoji-translator.git', // Update to point to your repository  
        user: {
            name: 'Youssef Lahssini', // update to use your name
            email: 'ylahssini@gmail.com' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
);
