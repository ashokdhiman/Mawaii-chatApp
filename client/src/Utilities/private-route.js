import React from 'react';
import { Route, Navigate, Outlet } from 'react-router-dom';

import { authenticationService } from '../Services/authenticationService';

const PrivateRoute = ({ children }) => {
    console.log("private route ran")
    const currentUser = authenticationService.currentUserValue;
    console.log(currentUser)
    alert(currentUser)
    return currentUser ? children : <Navigate to="/" />;
}
//     <Route
//         {...rest}
//         render={props => {
//             const currentUser = authenticationService.currentUserValue;
//             if (!currentUser) {
//                 // not logged in so redirect to login page with the return url
//                 return (
//                     <Navigate
//                         to={{ pathname: '/', state: { from: props.location } }}
//                     />
//                 );
//             }

//             // authorised so return component
//             return <Outlet {...props} />;
//         }}
//     />
// );

export default PrivateRoute;
