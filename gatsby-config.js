/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.org/docs/gatsby-config/
 */

module.exports = {
    plugins: [
        `gatsby-plugin-typescript`,
        `gatsby-plugin-postcss`,
        {
            resolve: `gatsby-plugin-prefetch-google-fonts`,
            options: {
                fonts: [
                    {
                        family: `Barlow`,
                        variants: [`300`, `600`]
                    },
                ],
            },
        }
    ],
}
