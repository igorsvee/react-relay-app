import React from "react";
import Relay from 'react-relay'
import  {

    fromGlobalId,

} from 'graphql-relay'

import {commitUpdate} from '../utils/RelayUtils'

import DeleteUserMutation from '../mutations/DeleteUserMutation';
import ToggleUserActivatedMutation from '../mutations/ToggleUserActivatedMutation';
class User extends React.Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static propTypes = {
    store: React.PropTypes.object.isRequired,
    user: React.PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      activationFailed: false
      , deletionFailed: false
    }
  }

  handleDetailsClick(id) {
    return () => {
      this.context.router.push("/users/" + id);
    }
  }

  handleDeleteClick(id) {
    return () => {
      console.log("deleting user #" + id)

      const deleteMutation = new DeleteUserMutation(
          {
            userId: id,
            store: this.props.store
          }
      );

      commitUpdate(Relay.Store, deleteMutation)
          .then((resp)=> this.props.afterDelete())
          .catch((transaction) => this._setDeleteErrorIfNotSet())


    }
  }

  setUserActivation(userId, activated) {
    return () => {
      const activationMutation = new ToggleUserActivatedMutation(
          {
            userId,
            activated
            , storeId: this.props.store.id
          }
      );

      commitUpdate(Relay.Store, activationMutation)
          .then((resp)=> {
            if (this.state.activationFailed) {
              this.setState({activationFailed: false})
            }
          })
          .catch((transaction) =>this._setActivationErrorIfNotSet())

    }

  }

  _setDeleteErrorIfNotSet() {
    if (!this.state.deletionFailed) {
      this.setState({deletionFailed: true})
    }
  }

  _setActivationErrorIfNotSet() {
    if (!this.state.activationFailed) {
      this.setState({activationFailed: true})
    }
  }

  render() {
    const {user, relay} = this.props;
    const relayUserId = user.id;
    const currentUsername = user.username;


    let styles = {};
    if (relayUserId == currentUsername) {//is set by delete mutation optimistic update
      styles = {display: 'none'};  // hide instead of returning null so the component doesn't get unmounted and the state is kept
    }

    const mongoId = fromGlobalId(relayUserId).id;

    return(
        <tr style={styles} key={relayUserId}>
          <td>mongoId - {mongoId}, relayId - {relayUserId}</td>
          <td>{currentUsername}</td>
          <td>{user.address}</td>
          <td>         {user.activated === true ? 'YES' : 'NO'} {user.activated === true ?
              <button onClick={this.setUserActivation(relayUserId, false)}>Deactivate</button>
              : <button onClick={this.setUserActivation(relayUserId, true)}>Activate</button>

          }</td>
          <td>
            <button onClick={this.handleDetailsClick(relayUserId)}>Details</button>
          </td>
          <td>
            <button onClick={this.handleDeleteClick(relayUserId)}>X</button>
          </td>
            {relay.hasOptimisticUpdate(user) && <td>Processing node ...</td> }
            {this.state.activationFailed && 'Activation Failed'}
            {this.state.deletionFailed && 'Deletion Failed'}
        </tr>)



  }
}

// fragment on User type!!!
User = Relay.createContainer(User, {
  fragments: {
    //  needs 3 fields from the User type
    user: () => Relay.QL`
     fragment UserInfo on User{
       activated,
       username,
       address,
       id
       
     }
     `
  }
});

export default User;