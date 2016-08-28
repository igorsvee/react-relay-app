import React from 'react';
import Relay from 'react-relay';

import {Link} from 'react-router';

import css from './UserApp.css'

import styleable from 'react-styleable'
import autobind from 'autobind-decorator'
import {withRouter} from 'react-router'
import {setRelayVariables, forceFetch, checkResponseOk} from'../utils/RelayUtils'
// import withStyles from 'isomorphic-style-loader/lib/withStyles';


@styleable(css)
@autobind
class UserApp extends React.Component {

  componentWillMount() {
    if (this.isAuthenticated()) {
      this.props.relay.setVariables({
        isAuthenticated: true,
        sessionId: this.getSessionIdFromProps(this.props)
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    const thisSessionId = this.getSessionIdFromProps(this.props);
    const nextSessionId = this.getSessionIdFromProps(nextProps);
    // console.log("UserApp componentWillReceiveProps this.props %O nextProps", this.props, nextProps)
    if (thisSessionId != nextSessionId) {
      this.props.relay.setVariables({
        isAuthenticated: nextSessionId != null,
        sessionId: nextSessionId ? nextSessionId : null
      })
    }
  }

  isAuthenticated() {
    return this.getSessionIdFromProps(this.props) != null;
  }

  getSessionIdFromProps(props) {
    return props.store.sessionId;
  }


  handleLogout = ()=> {
    const logoutSuccessPartialVariables = {
      isAuthenticated: false,
      sessionId: null
    };

    const goHome = ()=> {
      this.props.router.push({
        pathname: `/`
      })
    };

    fetch('/logout', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
        .then(checkResponseOk)
        .then(setRelayVariables.curry(this.props.relay, logoutSuccessPartialVariables))
        .then(this.props.relay.forceFetch.curry(logoutSuccessPartialVariables))
        .then(goHome);

  }

  hasUser() {
    return this.props.store.userConnection && this.props.store.userConnection.edges && this.props.store.userConnection.edges.length != 0
  }

  getUserName() {
    return this.props.store.userConnection.edges[0].node.username;
  }

  setRootRelayVariables(partialVars) {
    return setRelayVariables(this.props.relay, partialVars)
  }

  render() {
    const {isAuthenticated, sessionId} = this.props.relay.variables;
    // console.warn("Passing down authorization FLAG " + isAuthenticated);
    return (
        <div>
          <div className={this.props.css['main-header']}>
            {this.isAuthenticated() && this.hasUser() && this.getUserName()}
            <Link to="/">Home</Link>
            <Link to="/users">Users</Link>
            {!this.isAuthenticated() || this.getSessionIdFromProps(this.props) == 'mockSession' ?
                <Link to="/login">Login</Link> :
                <a className={this.props.css.link} onClick={this.handleLogout}>Logout</a>
            }
          </div>
          {/*If the child has a relay variable with the same name as the prop that gets passed down, the relay variable will have value automatically  */}
          {this.props.children}

        </div>


    )
  }
}

UserApp = Relay.createContainer(UserApp, {
  initialVariables: {
    isAuthenticated: false  // , transient, based on sessionId
    , sessionId: null
  },

  fragments: {
    store: () => Relay.QL`
     fragment UserInfo on Store{
      sessionId
      ,  userConnection( id: $sessionId) @include(if: $isAuthenticated) {
         edges{
                  node {
                    username,
                  }
          }
       }
       
     }
     `
  }
});
// export default withStyles(css)(UserApp)

export default withRouter(UserApp);